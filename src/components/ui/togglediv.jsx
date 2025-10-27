export function ToggleDiv(children, props) {
  return (
    <div
      {...props}
      // "h-7 w-7 bg-slate-100 rounded-full left-1 position: absolute"
    >
      {children}
    </div>
  );
}
