import clsx from "clsx";
export function Toggle({ classeToggleDiv, children, ...props }) {
  return (
    <button {...props}>
      {children}
      <div className={clsx(classeToggleDiv)}></div>
    </button>
  );
}
