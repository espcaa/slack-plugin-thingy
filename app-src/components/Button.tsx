interface ButtonProps {
  label: string;
  green?: boolean;
  onClick?: () => void;
  icon?: React.ReactNode;
}

const classes = {
  base: "c-button c-button--outline c-button--medium",
  green: "c-button c-button--primary c-button--medium",
};

export default function Button({ label, green, onClick, icon }: ButtonProps) {
  return (
    <button className={green ? classes.green : classes.base} onClick={onClick}>
      {icon}
      <span className="">{label}</span>
    </button>
  );
}
