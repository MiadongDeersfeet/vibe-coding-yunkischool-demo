import "./CommonFooter.css";

function CommonFooter() {
  return (
    <footer className="common-footer" aria-label="공통 푸터">
      <div className="common-footer__inner">
        <p className="common-footer__headline">yunkischool is deserved.</p>
        <p className="common-footer__description">
          언어 교육과 관광통역 학습의 가치를 위해, 오늘도 더 나은 배움을 만듭니다.
        </p>
        <div className="common-footer__contact">
          <span>Contact us: support@yunkischool.com</span>
          <span>Tel: 02-0000-0000</span>
          <span>Hours: Mon-Fri 10:00 - 18:00</span>
        </div>
        <small className="common-footer__copyright">
          © 2026 yunkischool. All rights reserved.
        </small>
      </div>
    </footer>
  );
}

export default CommonFooter;
