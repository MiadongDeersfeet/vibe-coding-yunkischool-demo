import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { apiUrl } from "../api";
import { jsonAuthHeaders } from "../api/authHeaders";
import { isMongoObjectIdString } from "../data/booksMerge";
import "./OrderCheckoutPage.css";

const PAYMENT_METHOD_OPTIONS = [
  { id: "card", label: "신용카드" },
  { id: "bank_transfer", label: "계좌이체" },
  { id: "kakaopay", label: "카카오페이" },
  { id: "naverpay", label: "네이버페이" },
];
const PORTONE_SCRIPT_URL = "https://cdn.iamport.kr/v1/iamport.js";
const PORTONE_MERCHANT_CODE = "imp47567740";
const PORTONE_PG = (import.meta.env.VITE_PORTONE_PG || "").trim();
const RESOLVED_PG = PORTONE_PG || "html5_inicis.INIpayTest";
const DAUM_POSTCODE_SCRIPT_URL =
  "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
const PAYMENT_GATEWAY_CONFIG = {
  card: { pg: RESOLVED_PG, pay_method: "card" },
  bank_transfer: { pg: RESOLVED_PG, pay_method: "trans" },
  kakaopay: { pg: RESOLVED_PG, pay_method: "kakaopay" },
  naverpay: { pg: RESOLVED_PG, pay_method: "naverpay" },
};

function formatPrice(n) {
  return `${new Intl.NumberFormat("ko-KR").format(Number(n) || 0)}원`;
}

function createEmptyShippingInfo() {
  return {
    recipientName: "",
    contact: "",
    address: "",
    addressDetail: "",
    postalCode: "",
  };
}

function buildMerchantUid() {
  return `order_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function OrderCheckoutPage() {
  const { kind, id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const returnLoginUrl = `/login?returnUrl=${encodeURIComponent(location.pathname)}`;

  const mode = kind === "lecture" || kind === "book" ? kind : null;
  const idOk = id && isMongoObjectIdString(id);

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [shippingInfo, setShippingInfo] = useState(createEmptyShippingInfo);
  const [isPostcodeReady, setIsPostcodeReady] = useState(false);
  const [addressSearchError, setAddressSearchError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [successOrder, setSuccessOrder] = useState(null);
  const [paymentModal, setPaymentModal] = useState({
    open: false,
    kind: "info",
    title: "",
    message: "",
  });

  const authToken = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;

  const backHref = useMemo(() => {
    if (mode === "lecture" && product?.languageKey) {
      return `/lectures/${product.languageKey}`;
    }
    if (mode === "lecture") return "/";
    return "/books";
  }, [mode, product]);

  const shippingRequired = mode === "book";
  const isShippingValid =
    !shippingRequired ||
    (shippingInfo.recipientName.trim() &&
      shippingInfo.contact.trim() &&
      shippingInfo.address.trim() &&
      shippingInfo.addressDetail.trim() &&
      shippingInfo.postalCode.trim());

  useEffect(() => {
    if (!mode || !idOk) {
      setLoading(false);
      setLoadError("잘못된 주문 주소입니다.");
      return;
    }

    let cancelled = false;
    const path = mode === "lecture" ? `/api/lectures/${id}` : `/api/books/${id}`;
    setLoading(true);
    setLoadError("");
    setProduct(null);

    fetch(apiUrl(path))
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.message || "상품 정보를 불러오지 못했습니다.");
        }
        return data;
      })
      .then((data) => {
        if (!cancelled) setProduct(data);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message || "상품 정보를 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [mode, id, idOk]);

  const lineTotal = useMemo(() => {
    if (!product) return 0;
    const unit = Number(product.price) || 0;
    if (mode === "book") return unit * quantity;
    return unit;
  }, [product, mode, quantity]);

  const canOrderLecture = mode === "lecture" && product && product.isActive !== false;
  const canOrderBook = mode === "book" && product && product.purchasable !== false;

  const handleShippingChange = (event) => {
    const { name, value } = event.target;
    setShippingInfo((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const initPortOne = () => {
      if (window.IMP && typeof window.IMP.init === "function") {
        window.IMP.init(PORTONE_MERCHANT_CODE);
      }
    };
    if (window.IMP) {
      initPortOne();
      return;
    }
    let cancelled = false;
    const existing = document.querySelector(`script[src="${PORTONE_SCRIPT_URL}"]`);
    if (existing) {
      existing.addEventListener("load", () => {
        if (!cancelled) initPortOne();
      });
      return () => {
        cancelled = true;
      };
    }
    const script = document.createElement("script");
    script.src = PORTONE_SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      if (!cancelled) initPortOne();
    };
    document.body.appendChild(script);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.daum?.Postcode) {
      setIsPostcodeReady(true);
      return;
    }
    let cancelled = false;
    const existing = document.querySelector(`script[src="${DAUM_POSTCODE_SCRIPT_URL}"]`);
    if (existing) {
      existing.addEventListener("load", () => {
        if (!cancelled) setIsPostcodeReady(true);
      });
      existing.addEventListener("error", () => {
        if (!cancelled) setAddressSearchError("주소 검색 스크립트를 불러오지 못했습니다.");
      });
      return () => {
        cancelled = true;
      };
    }
    const script = document.createElement("script");
    script.src = DAUM_POSTCODE_SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      if (!cancelled) setIsPostcodeReady(true);
    };
    script.onerror = () => {
      if (!cancelled) setAddressSearchError("주소 검색 스크립트를 불러오지 못했습니다.");
    };
    document.body.appendChild(script);
    return () => {
      cancelled = true;
    };
  }, []);

  const handleOpenAddressSearch = () => {
    setAddressSearchError("");
    if (!window.daum?.Postcode) {
      setAddressSearchError("주소 검색 준비 중입니다. 잠시 후 다시 시도해 주세요.");
      return;
    }
    new window.daum.Postcode({
      oncomplete: (data) => {
        const selectedAddress = data.roadAddress || data.jibunAddress || "";
        const selectedPostalCode = data.zonecode || "";
        setShippingInfo((prev) => ({
          ...prev,
          address: selectedAddress,
          postalCode: selectedPostalCode,
        }));
      },
    }).open();
  };

  const openPaymentModal = (kind, title, message) => {
    setPaymentModal({
      open: true,
      kind,
      title,
      message,
    });
  };

  const handleSubmit = async () => {
    setSubmitError("");
    if (!authToken) {
      setSubmitError("로그인이 필요합니다.");
      return;
    }
    if (!product || !mode) return;
    if (mode === "lecture" && !canOrderLecture) {
      setSubmitError("현재 주문할 수 없는 강의입니다.");
      return;
    }
    if (mode === "book" && !canOrderBook) {
      setSubmitError("현재 주문할 수 없는 도서입니다.");
      return;
    }
    if (!isShippingValid) {
      setSubmitError("배송 정보를 모두 입력해 주세요.");
      return;
    }

    const items =
      mode === "lecture"
        ? [{ itemType: "lecture", lectureId: product._id, quantity: 1 }]
        : [{ itemType: "book", bookId: product._id, quantity }];
    const gatewayConfig = PAYMENT_GATEWAY_CONFIG[paymentMethod];
    if (!gatewayConfig) {
      setSubmitError("지원하지 않는 결제 방식입니다.");
      return;
    }
    if (!window.IMP || typeof window.IMP.request_pay !== "function") {
      setSubmitError("결제 모듈이 아직 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const precheckRes = await fetch(apiUrl("/api/orders/precheck"), {
        method: "POST",
        headers: jsonAuthHeaders(),
        body: JSON.stringify({
          items,
          paymentMethod,
          shippingInfo: shippingRequired ? shippingInfo : undefined,
          expectedAmount: Number(lineTotal),
        }),
      });
      const precheckData = await precheckRes.json().catch(() => ({}));
      if (!precheckRes.ok) {
        throw new Error(precheckData.message || "결제 전 주문 검증에 실패했습니다.");
      }
      const validatedAmount = Number(precheckData.totalAmount) || Number(lineTotal);

      const authUserRaw = localStorage.getItem("authUser");
      let authUser = null;
      try {
        authUser = authUserRaw ? JSON.parse(authUserRaw) : null;
      } catch {
        authUser = null;
      }
      const buyerName = shippingRequired
        ? shippingInfo.recipientName
        : authUser?.name || "수강생";
      const buyerTel = shippingRequired ? shippingInfo.contact : "";
      const buyerAddr = shippingRequired
        ? `${shippingInfo.address} ${shippingInfo.addressDetail}`.trim()
        : "";
      const buyerPostcode = shippingRequired ? shippingInfo.postalCode : "";
      const buyerEmail = authUser?.email || "noor-tour@example.com";
      const merchantUid = buildMerchantUid();
      const redirectUrl = `${window.location.origin}${window.location.pathname}`;

      const paymentResponse = await new Promise((resolve, reject) => {
        const IMP = window.IMP;
        IMP.request_pay(
          {
            pg: gatewayConfig.pg,
            pay_method: gatewayConfig.pay_method,
            merchant_uid: merchantUid,
            name: title,
            amount: validatedAmount,
            buyer_email: buyerEmail,
            buyer_name: buyerName,
            buyer_tel: buyerTel,
            buyer_addr: buyerAddr,
            buyer_postcode: buyerPostcode,
            m_redirect_url: redirectUrl,
          },
          (rsp) => {
            if (rsp && rsp.success) {
              openPaymentModal("success", "결제 성공", "결제가 완료되었습니다. 주문을 생성합니다.");
              resolve(rsp);
              return;
            }
            const pgError = rsp?.error_msg || "";
            if (pgError.includes("pg 파라미터로 잘못된 값")) {
              const error = new Error(
                `결제 PG 설정이 올바르지 않습니다. VITE_PORTONE_PG 값을 확인해 주세요. (현재: ${RESOLVED_PG})`
              );
              error.isPaymentFailure = true;
              reject(error);
              return;
            }
            const error = new Error(pgError || "결제가 취소되었거나 실패했습니다.");
            error.isPaymentFailure = true;
            reject(error);
          }
        );
      });

      const res = await fetch(apiUrl("/api/orders/checkout"), {
        method: "POST",
        headers: jsonAuthHeaders(),
        body: JSON.stringify({
          items,
          paymentMethod,
          shippingInfo: shippingRequired ? shippingInfo : undefined,
          paymentGatewayResponse: {
            impUid: paymentResponse.imp_uid,
            merchantUid: paymentResponse.merchant_uid,
            paidAmount: paymentResponse.paid_amount,
            status: paymentResponse.status || "paid",
            raw: paymentResponse,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setSubmitError("로그인이 만료되었습니다. 다시 로그인해 주세요.");
        return;
      }
      if (!res.ok) {
        const error = new Error(data.message || "주문에 실패했습니다.");
        error.isOrderFailureAfterPayment = true;
        throw error;
      }
      setSuccessOrder(data);
    } catch (e) {
      setSubmitError(e.message || "주문에 실패했습니다.");
      if (e?.isPaymentFailure) {
        openPaymentModal("error", "결제 실패", e.message || "결제가 취소되었거나 실패했습니다.");
      } else if (e?.isOrderFailureAfterPayment) {
        openPaymentModal(
          "warning",
          "주문 저장 실패",
          `결제는 성공했지만 주문 저장에 실패했습니다. ${e.message || "관리자에게 문의해 주세요."}`
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!mode || !idOk) {
    return (
      <div className="order-checkout-page">
        <div className="order-checkout-inner">
          <p className="order-checkout-error">잘못된 주문 주소입니다.</p>
          <Link to="/">메인으로</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="order-checkout-page">
        <div className="order-checkout-inner">
          <p className="order-checkout-muted">상품 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (loadError || !product) {
    return (
      <div className="order-checkout-page">
        <div className="order-checkout-inner">
          <p className="order-checkout-error">{loadError || "상품을 찾을 수 없습니다."}</p>
          <Link to={backHref} className="order-checkout-back">
            ← 이전으로
          </Link>
        </div>
      </div>
    );
  }

  if (successOrder) {
    return (
      <div className="order-checkout-page">
        <div className="order-checkout-inner">
          <header className="order-checkout-header">
            <h1>주문이 완료되었습니다</h1>
            <p className="order-checkout-muted">선택한 결제수단으로 결제 요청이 처리되었습니다.</p>
          </header>
          <div className="order-checkout-card order-checkout-success-card">
            <p>
              주문 번호: <strong>{String(successOrder._id)}</strong>
            </p>
            <p>결제 금액: {formatPrice(successOrder.totalAmount)}</p>
            <p>
              결제 방식:{" "}
              {PAYMENT_METHOD_OPTIONS.find((opt) => opt.id === successOrder.paymentMethod)?.label ||
                successOrder.paymentMethod}
            </p>
          </div>
          <div className="order-checkout-actions">
            <Link to="/mypage" className="order-checkout-btn primary">
              마이페이지로
            </Link>
            <button type="button" className="order-checkout-btn ghost" onClick={() => navigate("/")}>
              메인으로
            </button>
          </div>
        </div>
      </div>
    );
  }

  const title = product.title || "상품";
  const imageUrl = product.imageUrl || "";

  return (
    <div className="order-checkout-page">
      <div className="order-checkout-inner">
        <header className="order-checkout-header">
          <Link to={backHref} className="order-checkout-back">
            ← {mode === "lecture" ? "강의 목록" : "도서 목록"}
          </Link>
          <h1>주문하기</h1>
          <p className="order-checkout-muted">
            {mode === "lecture" ? "온라인 강의" : "도서"} 주문서입니다. 금액은 서버에 등록된 가격으로 확정됩니다.
          </p>
        </header>

        <article className="order-checkout-card">
          <div className="order-checkout-row">
            {imageUrl ? (
              <div className="order-checkout-thumb-wrap">
                <img src={imageUrl} alt="" className="order-checkout-thumb" />
              </div>
            ) : null}
            <div className="order-checkout-meta">
              <h2>{title}</h2>
              {mode === "lecture" ? (
                <p className="order-checkout-instructor">{product.instructorName}</p>
              ) : (
                <p className="order-checkout-instructor">{product.subtitle}</p>
              )}
              <p className="order-checkout-price">{formatPrice(product.price)}</p>
              {mode === "lecture" && product.isActive === false ? (
                <p className="order-checkout-warn">판매 중이 아닌 강의입니다.</p>
              ) : null}
              {mode === "book" && product.purchasable === false ? (
                <p className="order-checkout-warn">현재 구매할 수 없는 도서입니다.</p>
              ) : null}
            </div>
          </div>

          {mode === "book" ? (
            <label className="order-checkout-qty">
              수량
              <input
                type="number"
                min={1}
                max={99}
                value={quantity}
                onChange={(e) => setQuantity(Math.min(99, Math.max(1, Number(e.target.value) || 1)))}
              />
            </label>
          ) : null}

          <div className="order-checkout-summary">
            <span>합계</span>
            <strong>{formatPrice(lineTotal)}</strong>
          </div>
        </article>

        {mode === "book" ? (
          <section className="order-checkout-card" aria-label="배송지 입력">
            <h3 className="order-checkout-section-title">배송 정보</h3>
            <p className="order-checkout-delivery-notice" role="note" aria-label="배송 안내">
              <span className="order-checkout-delivery-icon" aria-hidden="true">
                🚚
              </span>
              무료배송 · 배송은 3~5영업일 소요됩니다.
            </p>
            <div className="order-checkout-form-grid">
              <label>
                이름
                <input
                  type="text"
                  name="recipientName"
                  value={shippingInfo.recipientName}
                  onChange={handleShippingChange}
                  placeholder="수령인 이름"
                  required
                />
              </label>
              <label>
                연락처
                <input
                  type="tel"
                  name="contact"
                  value={shippingInfo.contact}
                  onChange={handleShippingChange}
                  placeholder="010-1234-5678"
                  required
                />
              </label>
              <label className="is-full">
                주소
                <div className="order-checkout-address-row">
                  <input
                    type="text"
                    name="address"
                    value={shippingInfo.address}
                    placeholder="주소검색으로 입력"
                    readOnly
                    required
                  />
                  <button
                    type="button"
                    className="order-checkout-address-btn"
                    onClick={handleOpenAddressSearch}
                    disabled={!isPostcodeReady}
                  >
                    {isPostcodeReady ? "주소검색" : "로딩중"}
                  </button>
                </div>
              </label>
              <label>
                상세주소
                <input
                  type="text"
                  name="addressDetail"
                  value={shippingInfo.addressDetail}
                  onChange={handleShippingChange}
                  placeholder="동/호수"
                  required
                />
              </label>
              <label>
                우편번호
                <input
                  type="text"
                  name="postalCode"
                  value={shippingInfo.postalCode}
                  placeholder="주소검색으로 자동입력"
                  readOnly
                  required
                />
              </label>
            </div>
            {addressSearchError ? <p className="order-checkout-error">{addressSearchError}</p> : null}
          </section>
        ) : null}

        <section className="order-checkout-card" aria-label="결제수단 선택">
          <h3 className="order-checkout-section-title">결제 방식</h3>
          <div className="order-checkout-payment-methods">
            {PAYMENT_METHOD_OPTIONS.map((opt) => (
              <label
                key={opt.id}
                className={`order-checkout-method ${paymentMethod === opt.id ? "is-selected" : ""}`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={opt.id}
                  checked={paymentMethod === opt.id}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </section>

        {!authToken ? (
          <p className="order-checkout-login-hint">
            주문하려면{" "}
            <Link to={returnLoginUrl} className="order-checkout-inline-link">
              로그인
            </Link>
            이 필요합니다.
          </p>
        ) : null}

        {submitError ? <p className="order-checkout-error">{submitError}</p> : null}

        <div className="order-checkout-actions">
          <button
            type="button"
            className="order-checkout-btn primary"
            disabled={
              submitting ||
              !authToken ||
              (mode === "lecture" && !canOrderLecture) ||
              (mode === "book" && !canOrderBook) ||
              !isShippingValid
            }
            onClick={handleSubmit}
          >
            {submitting ? "처리 중..." : "주문하기"}
          </button>
        </div>
      </div>

      {paymentModal.open ? (
        <div className="order-checkout-modal-overlay" role="dialog" aria-modal="true">
          <div className={`order-checkout-modal order-checkout-modal-${paymentModal.kind}`}>
            <h3>{paymentModal.title}</h3>
            <p>{paymentModal.message}</p>
            <button
              type="button"
              className="order-checkout-modal-close"
              onClick={() => setPaymentModal((prev) => ({ ...prev, open: false }))}
            >
              확인
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default OrderCheckoutPage;
