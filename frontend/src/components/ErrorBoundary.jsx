import { Component } from "react";

// Without this, a runtime error in any admin page (like the "destroy is not
// a function" bug in Categories.jsx) crashes the whole React tree silently
// -- the admin just sees a blank page with no way to recover except a hard
// refresh, and no clue what happened. This catches it and offers a retry.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center">
          <p className="text-lg font-bold mb-2">حصل خطأ غير متوقع في هذه الصفحة</p>
          <p className="text-sm text-[var(--ink-soft)] mb-4">جرّب تحميل الصفحة تاني.</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-5 py-2 rounded-full font-bold text-white text-sm"
            style={{ background: "var(--red)" }}
          >
            إعادة المحاولة
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
