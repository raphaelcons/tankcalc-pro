export function Input({ label, ...props }) {
  return (
    <div className="flex flex-col">
      {label && <label className="mb-1 font-bold">{label}</label>}
      <input
        {...props}
        className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}
