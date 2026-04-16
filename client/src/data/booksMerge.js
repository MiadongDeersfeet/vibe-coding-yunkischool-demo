import { apiUrl } from "../api";
import { bookCards as staticBookCards } from "./bookCards";

export function isMongoObjectIdString(value) {
  return typeof value === "string" && /^[a-fA-F0-9]{24}$/.test(value);
}

/** Mongo 문서 또는 이미 가공된 카드를 목록/상세 공통 형태로 맞춤 */
export function serverBookToDisplay(doc) {
  if (!doc) return null;
  const id = doc._id != null ? String(doc._id) : doc.id;
  if (!id) return null;
  return {
    id,
    title: doc.title || "",
    subtitle: doc.subtitle || "",
    meta: doc.purchasable === false ? "일시 품절" : "도서 구매",
    image: doc.imageUrl || doc.image || "",
    description: doc.description,
    authorName: doc.authorName,
    publisherName: doc.publisherName,
    publishDate: doc.publishDate,
    price: doc.price,
    purchasable: doc.purchasable,
    imageUrl: doc.imageUrl || doc.image,
  };
}

export async function fetchServerBooks() {
  try {
    const res = await fetch(apiUrl("/api/books"));
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/** DB에 등록된 도서를 앞에 두고, 기존 정적 목록을 이어 붙임 */
export function mergeBooksForDisplay(serverDocs) {
  const fromDb = serverDocs.map(serverBookToDisplay).filter(Boolean);
  return [...fromDb, ...staticBookCards];
}

export async function fetchBookDisplayById(bookId) {
  if (!isMongoObjectIdString(bookId)) return null;
  try {
    const res = await fetch(apiUrl(`/api/books/${bookId}`));
    if (!res.ok) return null;
    const doc = await res.json();
    return serverBookToDisplay(doc);
  } catch {
    return null;
  }
}
