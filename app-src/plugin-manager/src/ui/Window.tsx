import "./window.css";

interface WindowProps {
  children: React.ReactNode;
  title: string;
  onClose?: () => void;
}

export default function Window({ children, title, onClose }: WindowProps) {
  return (
    <div className="mainModal c-sk-modal c-sk-modal--responsive p-prefs_dialog__modal--ia_layout">
      <div className="c-sk-modal_header">
        <div className="c-sk-modal_title_bar c-sk-modal_title_bar--pad_right p-prefs_dialog__title_bar">
          <div className="c-sk-modal_title_bar__text ">
            <h1 className="">{title}</h1>
          </div>
        </div>
      </div>
      <button
        className="c-button-unstyled c-icon_button c-icon_button--size_medium c-sk-modal__close_button c-icon_button--default"
        data-qa="sk_close_modal_button"
        aria-label="Fermer"
        type="button"
        onClick={onClose}
      >
        <svg
          data-i0m="true"
          data-qa="close"
          aria-hidden="true"
          viewBox="0 0 20 20"
          className=""
        >
          <path
            fill="currentColor"
            fill-rule="evenodd"
            d="M16.53 3.47a.75.75 0 0 1 0 1.06L11.06 10l5.47 5.47a.75.75 0 0 1-1.06 1.06L10 11.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L8.94 10 3.47 4.53a.75.75 0 0 1 1.06-1.06L10 8.94l5.47-5.47a.75.75 0 0 1 1.06 0"
            clip-rule="evenodd"
          ></path>
        </svg>
      </button>
      <div
        className="mainContainer"
        style={{
          marginBottom: 32,
        }}
      >
        {children}
      </div>
    </div>
  );
}
