interface TabButtonProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export default function TabButton({ label, active, onClick }: TabButtonProps) {
  return (
    <button
      className={
        "c-button-unstyled c-tabs__tab js-tab" +
        (active ? " c-tabs__tab--active" : "")
      }
      data-qa="tabs_item"
      id="templates"
      aria-haspopup="false"
      role="tab"
      aria-selected="true"
      type="button"
      onClick={onClick}
    >
      <span className="c-tabs__tab_content">{label}</span>
    </button>
  );
}
