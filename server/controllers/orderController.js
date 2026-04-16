const mongoose = require("mongoose");
const Order = require("../models/Order");
const Payment = require("../models/Payment");
const Lecture = require("../models/Lecture");
const Book = require("../models/Book");
const LecturePurchase = require("../models/LecturePurchase");
const BookPurchase = require("../models/BookPurchase");

const MAX_ITEMS = 20;
const PAYMENT_METHODS = new Set(["card", "bank_transfer", "kakaopay", "naverpay"]);
const PORTONE_API_BASE = "https://api.iamport.kr";
const PORTONE_VERIFY_RETRY_COUNT = 4;
const PORTONE_VERIFY_RETRY_DELAY_MS = 500;
const ALERT_WEBHOOK_URL = process.env.ALERT_WEBHOOK_URL || "";

function buildLineFromLecture(lec) {
  return {
    itemType: "lecture",
    lectureId: lec._id,
    bookId: null,
    title: lec.title,
    unitPrice: lec.price,
    quantity: 1,
  };
}

function buildLineFromBook(book, quantity) {
  return {
    itemType: "book",
    lectureId: null,
    bookId: book._id,
    title: book.title,
    unitPrice: book.price,
    quantity,
  };
}

async function hasActiveLecturePurchase(userId, lectureId) {
  const activePurchase = await LecturePurchase.findOne({
    userId,
    lectureId,
    revokedAt: null,
  }).lean();
  if (activePurchase) return true;

  // Fallback guard: even if purchase rows are missing, block re-purchase
  // when a paid order already contains this lecture.
  const paidOrder = await Order.findOne({
    userId,
    status: "paid",
    items: {
      $elemMatch: {
        itemType: "lecture",
        lectureId,
      },
    },
  })
    .select("_id")
    .lean();
  return Boolean(paidOrder);
}

async function issuePortOneToken() {
  const restApiKey = process.env.PORTONE_REST_API_KEY || process.env.IAMPORT_REST_API_KEY || "";
  const restApiSecret = process.env.PORTONE_REST_API_SECRET || process.env.IAMPORT_REST_API_SECRET || "";
  if (!restApiKey || !restApiSecret) {
    throw new Error("PORTONE_REST_API_KEY and PORTONE_REST_API_SECRET are required.");
  }

  const res = await fetch(`${PORTONE_API_BASE}/users/getToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imp_key: restApiKey,
      imp_secret: restApiSecret,
    }),
  });
  const data = await res.json().catch(() => ({}));
  const accessToken = data?.response?.access_token;
  if (!res.ok || data?.code !== 0 || !accessToken) {
    throw new Error(data?.message || "Failed to issue PortOne access token.");
  }
  return accessToken;
}

async function getPortOnePayment(impUid) {
  const token = await issuePortOneToken();
  const res = await fetch(`${PORTONE_API_BASE}/payments/${encodeURIComponent(impUid)}`, {
    headers: { Authorization: token },
  });
  const data = await res.json().catch(() => ({}));
  const payment = data?.response;
  if (!res.ok || data?.code !== 0 || !payment) {
    throw new Error(data?.message || "Failed to fetch payment from PortOne.");
  }
  return payment;
}

async function getPortOnePaymentByMerchantUid(merchantUid) {
  const token = await issuePortOneToken();
  const res = await fetch(`${PORTONE_API_BASE}/payments/find/${encodeURIComponent(merchantUid)}`, {
    headers: { Authorization: token },
  });
  const data = await res.json().catch(() => ({}));
  const payment = data?.response;
  if (!res.ok || data?.code !== 0 || !payment) {
    throw new Error(data?.message || "Failed to fetch payment by merchant_uid from PortOne.");
  }
  return payment;
}

async function cancelPortOnePayment({ impUid, amount, reason }) {
  const token = await issuePortOneToken();
  const payload = {
    imp_uid: impUid,
    reason: reason || "주문 처리 실패로 자동 환불",
  };
  if (Number(amount) > 0) {
    payload.amount = Number(amount);
  }

  const res = await fetch(`${PORTONE_API_BASE}/payments/cancel`, {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.code !== 0) {
    throw new Error(data?.message || "Failed to cancel payment on PortOne.");
  }
  return data?.response || null;
}

async function notifyOps(title, message, extra = {}) {
  const payload = {
    source: "orderController",
    title,
    message,
    extra,
    at: new Date().toISOString(),
  };
  console.error(`[OPS ALERT] ${title}: ${message}`, extra);
  if (!ALERT_WEBHOOK_URL) return;
  try {
    await fetch(ALERT_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("[OPS ALERT] webhook delivery failed:", error?.message || error);
  }
}

function mapPortOneToOrderStatus(status) {
  if (status === "paid") return "paid";
  if (status === "cancelled") return "refunded";
  if (status === "failed") return "cancelled";
  return "pending";
}

function mapPortOneToPaymentStatus(status) {
  if (status === "paid") return "succeeded";
  if (status === "cancelled") return "refunded";
  if (status === "failed") return "failed";
  return "pending";
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getPortOnePaymentWithRetry(impUid, merchantUid) {
  let lastError = null;
  for (let attempt = 0; attempt < PORTONE_VERIFY_RETRY_COUNT; attempt += 1) {
    try {
      return await getPortOnePayment(impUid);
    } catch (error) {
      lastError = error;
      const message = String(error?.message || "");
      const isNotFound = message.includes("존재하지 않는 결제정보");
      if (isNotFound && merchantUid) {
        try {
          return await getPortOnePaymentByMerchantUid(merchantUid);
        } catch (merchantError) {
          lastError = merchantError;
        }
      }
      if (!isNotFound || attempt === PORTONE_VERIFY_RETRY_COUNT - 1) {
        throw error;
      }
      await sleep(PORTONE_VERIFY_RETRY_DELAY_MS * (attempt + 1));
    }
  }
  throw lastError || new Error("Failed to fetch payment from PortOne.");
}

/**
 * Creates a paid order with mock payment and fulfillment rows (LecturePurchase / BookPurchase).
 * Prices are always taken from the database, not from the client.
 */
const checkout = async (req, res) => {
  try {
    const userId = req.userId;
    const {
      items: rawItems,
      paymentMethod: rawPaymentMethod,
      shippingInfo: rawShippingInfo,
      paymentGatewayResponse: rawPaymentGatewayResponse,
    } = req.body || {};
    const paymentMethod = String(rawPaymentMethod || "card");

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return res.status(400).json({ message: "주문 품목이 비어 있습니다." });
    }
    if (rawItems.length > MAX_ITEMS) {
      return res.status(400).json({ message: `한 번에 주문할 수 있는 품목은 최대 ${MAX_ITEMS}개입니다.` });
    }
    if (!PAYMENT_METHODS.has(paymentMethod)) {
      return res.status(400).json({ message: "지원하지 않는 결제수단입니다." });
    }
    const paymentGatewayResponse = {
      impUid: String(rawPaymentGatewayResponse?.impUid || "").trim(),
      merchantUid: String(rawPaymentGatewayResponse?.merchantUid || "").trim(),
      paidAmount: Number(rawPaymentGatewayResponse?.paidAmount) || 0,
      status: String(rawPaymentGatewayResponse?.status || "").trim(),
      raw: rawPaymentGatewayResponse?.raw || null,
    };
    if (!paymentGatewayResponse.impUid || !paymentGatewayResponse.merchantUid) {
      return res.status(400).json({ message: "결제 응답 정보가 누락되었습니다." });
    }
    if (paymentGatewayResponse.status && paymentGatewayResponse.status !== "paid") {
      return res.status(400).json({ message: "결제가 완료되지 않았습니다." });
    }
    const duplicated = await Payment.findOne({ providerPaymentId: paymentGatewayResponse.impUid }).lean();
    if (duplicated) {
      return res.status(409).json({ message: "이미 처리된 결제입니다." });
    }

    const normalized = [];
    const seenLectureIds = new Set();
    const seenBookIds = new Set();
    let hasBookLine = false;

    for (const raw of rawItems) {
      const itemType = raw.itemType;
      if (itemType === "lecture") {
        const lid = raw.lectureId;
        if (!mongoose.Types.ObjectId.isValid(String(lid))) {
          return res.status(400).json({ message: "유효하지 않은 강의 id입니다." });
        }
        const lec = await Lecture.findById(lid);
        if (!lec) {
          return res.status(404).json({ message: "강의를 찾을 수 없습니다." });
        }
        if (!lec.isActive) {
          return res.status(400).json({ message: "판매 중이 아닌 강의입니다." });
        }
        const already = await hasActiveLecturePurchase(userId, lec._id);
        if (already) {
          return res.status(409).json({ message: "이미 구매한 강의입니다." });
        }
        const lecKey = String(lec._id);
        if (seenLectureIds.has(lecKey)) {
          return res.status(400).json({ message: "같은 강의가 주문에 중복되었습니다." });
        }
        seenLectureIds.add(lecKey);
        normalized.push(buildLineFromLecture(lec));
      } else if (itemType === "book") {
        hasBookLine = true;
        const bid = raw.bookId;
        if (!mongoose.Types.ObjectId.isValid(String(bid))) {
          return res.status(400).json({ message: "유효하지 않은 도서 id입니다." });
        }
        const book = await Book.findById(bid);
        if (!book) {
          return res.status(404).json({ message: "도서를 찾을 수 없습니다." });
        }
        if (book.purchasable === false) {
          return res.status(400).json({ message: "현재 구매할 수 없는 도서입니다." });
        }
        const qty = Math.min(99, Math.max(1, Number(raw.quantity) || 1));
        const bookKey = String(book._id);
        if (seenBookIds.has(bookKey)) {
          return res.status(400).json({ message: "같은 도서가 주문에 중복되었습니다." });
        }
        seenBookIds.add(bookKey);
        normalized.push(buildLineFromBook(book, qty));
      } else {
        return res.status(400).json({ message: "itemType은 lecture 또는 book 이어야 합니다." });
      }
    }
    const shippingInfo = {
      recipientName: String(rawShippingInfo?.recipientName || "").trim(),
      contact: String(rawShippingInfo?.contact || "").trim(),
      address: String(rawShippingInfo?.address || "").trim(),
      addressDetail: String(rawShippingInfo?.addressDetail || "").trim(),
      postalCode: String(rawShippingInfo?.postalCode || "").trim(),
    };
    if (hasBookLine) {
      if (
        !shippingInfo.recipientName ||
        !shippingInfo.contact ||
        !shippingInfo.address ||
        !shippingInfo.addressDetail ||
        !shippingInfo.postalCode
      ) {
        return res.status(400).json({ message: "도서 주문에는 이름/연락처/주소/상세주소/우편번호가 필요합니다." });
      }
    }

    const totalAmount = normalized.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
    if (Math.abs(paymentGatewayResponse.paidAmount - totalAmount) > 0.001) {
      return res.status(400).json({ message: "결제 금액이 주문 금액과 일치하지 않습니다." });
    }
    let verifiedPayment = null;
    try {
      verifiedPayment = await getPortOnePaymentWithRetry(
        paymentGatewayResponse.impUid,
        paymentGatewayResponse.merchantUid
      );
    } catch (verifyError) {
      const detail = verifyError?.message ? ` (${verifyError.message})` : "";
      return res.status(400).json({ message: `포트원 결제 검증에 실패했습니다.${detail}` });
    }
    if (String(verifiedPayment.status || "") !== "paid") {
      return res.status(400).json({ message: "결제가 완료되지 않았습니다." });
    }
    if (String(verifiedPayment.merchant_uid || "") !== paymentGatewayResponse.merchantUid) {
      return res.status(400).json({ message: "주문번호 검증에 실패했습니다." });
    }
    if (Math.abs((Number(verifiedPayment.amount) || 0) - totalAmount) > 0.001) {
      return res.status(400).json({ message: "포트원 결제 금액이 주문 금액과 일치하지 않습니다." });
    }

    let order = null;
    try {
      order = await Order.create({
        userId,
        paymentMethod,
        items: normalized,
        currency: "KRW",
        totalAmount,
        status: "paid",
        paymentGateway: {
          impUid: paymentGatewayResponse.impUid,
          merchantUid: paymentGatewayResponse.merchantUid,
          paidAmount: Number(verifiedPayment.amount) || paymentGatewayResponse.paidAmount,
          status: String(verifiedPayment.status || paymentGatewayResponse.status || "paid"),
          raw: verifiedPayment,
        },
        shippingInfo: hasBookLine ? shippingInfo : undefined,
      });

      await Payment.create({
        orderId: order._id,
        userId,
        paymentMethod,
        amount: totalAmount,
        currency: "KRW",
        provider: paymentMethod,
        providerPaymentId: paymentGatewayResponse.impUid,
        status: "succeeded",
        paidAt: new Date(),
      });

      for (const line of normalized) {
        if (line.itemType === "lecture") {
          await LecturePurchase.create({
            userId,
            lectureId: line.lectureId,
            orderId: order._id,
          });
        } else {
          await BookPurchase.create({
            userId,
            bookId: line.bookId,
            orderId: order._id,
            quantity: line.quantity,
          });
        }
      }
    } catch (inner) {
      if (order) {
        await Payment.deleteMany({ orderId: order._id });
        await LecturePurchase.deleteMany({ orderId: order._id });
        await BookPurchase.deleteMany({ orderId: order._id });
        await Order.findByIdAndDelete(order._id);
      }
      let cancelFailureMessage = "";
      const shouldAttemptCancel =
        inner?.code !== 11000 && verifiedPayment && paymentGatewayResponse?.impUid;
      if (shouldAttemptCancel) {
        try {
          await cancelPortOnePayment({
            impUid: paymentGatewayResponse.impUid,
            amount: Number(verifiedPayment.amount) || totalAmount,
            reason: "주문 처리 실패로 자동 환불",
          });
        } catch (cancelError) {
          cancelFailureMessage = ` 결제 취소에도 실패했습니다. 관리자 확인이 필요합니다. (${cancelError.message})`;
          await notifyOps("결제 취소 실패", "주문 처리 실패 후 결제 취소에 실패했습니다.", {
            impUid: paymentGatewayResponse.impUid,
            merchantUid: paymentGatewayResponse.merchantUid,
            reason: cancelError.message,
          });
        }
      }
      if (inner.name === "ValidationError") {
        return res.status(400).json({ message: `${inner.message}${cancelFailureMessage}` });
      }
      if (inner?.code === 11000) {
        return res.status(409).json({ message: "중복 결제 또는 중복 주문 요청입니다." });
      }
      const detail = inner?.message ? ` (${inner.message})` : "";
      return res.status(500).json({ message: `주문 처리에 실패했습니다.${detail}${cancelFailureMessage}` });
    }

    const populated = await Order.findById(order._id).lean();
    res.status(201).json(populated);
  } catch (error) {
    const detail = error?.message ? ` (${error.message})` : "";
    res.status(500).json({ message: `주문 처리에 실패했습니다.${detail}` });
  }
};

const precheckCheckout = async (req, res) => {
  try {
    const userId = req.userId;
    const {
      items: rawItems,
      paymentMethod: rawPaymentMethod,
      shippingInfo: rawShippingInfo,
      expectedAmount: rawExpectedAmount,
    } = req.body || {};
    const paymentMethod = String(rawPaymentMethod || "card");

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return res.status(400).json({ message: "주문 품목이 비어 있습니다." });
    }
    if (rawItems.length > MAX_ITEMS) {
      return res.status(400).json({ message: `한 번에 주문할 수 있는 품목은 최대 ${MAX_ITEMS}개입니다.` });
    }
    if (!PAYMENT_METHODS.has(paymentMethod)) {
      return res.status(400).json({ message: "지원하지 않는 결제수단입니다." });
    }

    const normalized = [];
    const seenLectureIds = new Set();
    const seenBookIds = new Set();
    let hasBookLine = false;

    for (const raw of rawItems) {
      const itemType = raw.itemType;
      if (itemType === "lecture") {
        const lid = raw.lectureId;
        if (!mongoose.Types.ObjectId.isValid(String(lid))) {
          return res.status(400).json({ message: "유효하지 않은 강의 id입니다." });
        }
        const lec = await Lecture.findById(lid);
        if (!lec) {
          return res.status(404).json({ message: "강의를 찾을 수 없습니다." });
        }
        if (!lec.isActive) {
          return res.status(400).json({ message: "판매 중이 아닌 강의입니다." });
        }
        const already = await hasActiveLecturePurchase(userId, lec._id);
        if (already) {
          return res.status(409).json({ message: "이미 구매한 강의입니다." });
        }
        const lecKey = String(lec._id);
        if (seenLectureIds.has(lecKey)) {
          return res.status(400).json({ message: "같은 강의가 주문에 중복되었습니다." });
        }
        seenLectureIds.add(lecKey);
        normalized.push(buildLineFromLecture(lec));
      } else if (itemType === "book") {
        hasBookLine = true;
        const bid = raw.bookId;
        if (!mongoose.Types.ObjectId.isValid(String(bid))) {
          return res.status(400).json({ message: "유효하지 않은 도서 id입니다." });
        }
        const book = await Book.findById(bid);
        if (!book) {
          return res.status(404).json({ message: "도서를 찾을 수 없습니다." });
        }
        if (book.purchasable === false) {
          return res.status(400).json({ message: "현재 구매할 수 없는 도서입니다." });
        }
        const qty = Math.min(99, Math.max(1, Number(raw.quantity) || 1));
        const bookKey = String(book._id);
        if (seenBookIds.has(bookKey)) {
          return res.status(400).json({ message: "같은 도서가 주문에 중복되었습니다." });
        }
        seenBookIds.add(bookKey);
        normalized.push(buildLineFromBook(book, qty));
      } else {
        return res.status(400).json({ message: "itemType은 lecture 또는 book 이어야 합니다." });
      }
    }

    const shippingInfo = {
      recipientName: String(rawShippingInfo?.recipientName || "").trim(),
      contact: String(rawShippingInfo?.contact || "").trim(),
      address: String(rawShippingInfo?.address || "").trim(),
      addressDetail: String(rawShippingInfo?.addressDetail || "").trim(),
      postalCode: String(rawShippingInfo?.postalCode || "").trim(),
    };
    if (hasBookLine) {
      if (
        !shippingInfo.recipientName ||
        !shippingInfo.contact ||
        !shippingInfo.address ||
        !shippingInfo.addressDetail ||
        !shippingInfo.postalCode
      ) {
        return res.status(400).json({ message: "도서 주문에는 이름/연락처/주소/상세주소/우편번호가 필요합니다." });
      }
    }

    const totalAmount = normalized.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
    const expectedAmount = Number(rawExpectedAmount) || 0;
    if (expectedAmount > 0 && Math.abs(expectedAmount - totalAmount) > 0.001) {
      return res.status(409).json({
        message: "상품 금액이 변경되어 결제를 진행할 수 없습니다. 최신 금액으로 다시 시도해 주세요.",
        totalAmount,
      });
    }

    return res.status(200).json({
      ok: true,
      totalAmount,
      paymentMethod,
      shippingRequired: hasBookLine,
    });
  } catch (error) {
    return res.status(500).json({ message: "주문 사전 검증에 실패했습니다." });
  }
};

const handlePortOneWebhook = async (req, res) => {
  try {
    const impUid = String(req.body?.imp_uid || req.body?.impUid || "").trim();
    const merchantUid = String(req.body?.merchant_uid || req.body?.merchantUid || "").trim();
    if (!impUid) {
      return res.status(400).json({ message: "imp_uid is required." });
    }

    let verifiedPayment = null;
    try {
      verifiedPayment = await getPortOnePaymentWithRetry(impUid, merchantUid);
    } catch (error) {
      await notifyOps("포트원 웹훅 검증 실패", "웹훅 수신 후 결제 검증에 실패했습니다.", {
        impUid,
        merchantUid,
        reason: error.message,
      });
      return res.status(400).json({ message: "결제 검증에 실패했습니다." });
    }

    const order = await Order.findOne({ "paymentGateway.impUid": impUid });
    if (!order) {
      await notifyOps("웹훅 주문 미매칭", "웹훅 결제에 해당하는 주문을 찾지 못했습니다.", {
        impUid,
        merchantUid: verifiedPayment?.merchant_uid || merchantUid,
        status: verifiedPayment?.status || "",
      });
      return res.status(202).json({ ok: true, message: "order not found; alert sent" });
    }

    const remoteStatus = String(verifiedPayment.status || "").trim();
    const nextOrderStatus = mapPortOneToOrderStatus(remoteStatus);
    const nextPaymentStatus = mapPortOneToPaymentStatus(remoteStatus);
    const cancelDate = new Date();

    order.status = nextOrderStatus;
    order.paymentGateway = {
      ...order.paymentGateway,
      impUid,
      merchantUid: String(verifiedPayment.merchant_uid || order.paymentGateway?.merchantUid || ""),
      paidAmount: Number(verifiedPayment.amount) || Number(order.paymentGateway?.paidAmount) || 0,
      status: remoteStatus || String(order.paymentGateway?.status || ""),
      raw: verifiedPayment,
    };
    await order.save();

    await Payment.updateMany(
      { providerPaymentId: impUid },
      {
        $set: {
          status: nextPaymentStatus,
          paidAt: nextPaymentStatus === "succeeded" ? new Date() : null,
        },
      }
    );

    if (nextOrderStatus !== "paid") {
      await LecturePurchase.updateMany({ orderId: order._id, revokedAt: null }, { $set: { revokedAt: cancelDate } });
      await BookPurchase.updateMany({ orderId: order._id, revokedAt: null }, { $set: { revokedAt: cancelDate } });
    }

    res.status(200).json({
      ok: true,
      orderId: String(order._id),
      orderStatus: nextOrderStatus,
      paymentStatus: nextPaymentStatus,
    });
  } catch (error) {
    await notifyOps("포트원 웹훅 처리 실패", "웹훅 처리 중 예외가 발생했습니다.", {
      reason: error.message,
      body: req.body || null,
    });
    res.status(500).json({ message: "웹훅 처리에 실패했습니다." });
  }
};

const getOrderById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "유효하지 않은 주문 id입니다." });
    }

    const order = await Order.findById(req.params.id).lean();
    if (!order) {
      return res.status(404).json({ message: "주문을 찾을 수 없습니다." });
    }
    if (String(order.userId) !== String(req.userId)) {
      return res.status(403).json({ message: "이 주문을 조회할 권한이 없습니다." });
    }

    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ message: "주문 조회에 실패했습니다." });
  }
};

const listMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .populate("items.lectureId", "title imageUrl instructorName languageKey")
      .populate("items.bookId", "title subtitle imageUrl")
      .lean();

    const flattened = [];
    for (const order of orders) {
      for (const item of order.items || []) {
        const lecture = item.lectureId || null;
        const book = item.bookId || null;
        flattened.push({
          orderId: String(order._id),
          orderedAt: order.createdAt,
          orderStatus: order.status,
          itemType: item.itemType,
          title: item.title,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          lineAmount: item.unitPrice * item.quantity,
          lecture: lecture
            ? {
                id: String(lecture._id),
                title: lecture.title,
                imageUrl: lecture.imageUrl,
                instructorName: lecture.instructorName,
                languageKey: lecture.languageKey,
              }
            : null,
          book: book
            ? {
                id: String(book._id),
                title: book.title,
                subtitle: book.subtitle,
                imageUrl: book.imageUrl,
              }
            : null,
        });
      }
    }

    res.status(200).json(flattened);
  } catch (error) {
    res.status(500).json({ message: "주문 목록 조회에 실패했습니다." });
  }
};

const listAllOrderItemsForAdmin = async (_req, res) => {
  try {
    const orders = await Order.find({})
      .sort({ createdAt: -1 })
      .populate("userId", "name email")
      .populate("items.lectureId", "title imageUrl instructorName languageKey")
      .populate("items.bookId", "title subtitle imageUrl")
      .lean();

    const rows = [];
    for (const order of orders) {
      const user = order.userId || null;
      for (const item of order.items || []) {
        const lecture = item.lectureId || null;
        const book = item.bookId || null;
        rows.push({
          orderId: String(order._id),
          orderedAt: order.createdAt,
          orderStatus: order.status,
          user: user
            ? {
                id: String(user._id),
                name: user.name || "",
                email: user.email || "",
              }
            : null,
          itemType: item.itemType,
          title: item.title,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          lineAmount: item.unitPrice * item.quantity,
          lecture: lecture
            ? {
                id: String(lecture._id),
                title: lecture.title,
                imageUrl: lecture.imageUrl,
                instructorName: lecture.instructorName,
                languageKey: lecture.languageKey,
              }
            : null,
          book: book
            ? {
                id: String(book._id),
                title: book.title,
                subtitle: book.subtitle,
                imageUrl: book.imageUrl,
              }
            : null,
        });
      }
    }

    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({ message: "관리자 주문 목록 조회에 실패했습니다." });
  }
};

module.exports = {
  checkout,
  precheckCheckout,
  getOrderById,
  listMyOrders,
  listAllOrderItemsForAdmin,
  handlePortOneWebhook,
};
