export function Select({ label, value, onChange, options }) {
  return (
    <div className="flex flex-col">
      {label && <label className="mb-1 font-bold">{label}</label>}
      <select
        value={value}
        onChange={onChange}
        className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
