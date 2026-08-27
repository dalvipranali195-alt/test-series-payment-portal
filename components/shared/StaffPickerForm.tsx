/** GET form used by every "new record" page when an Admin is submitting on someone else's behalf. */
export default function StaffPickerForm({
  roleLabel,
  options,
}: {
  roleLabel: string;
  options: { id: string; name: string }[];
}) {
  if (options.length === 0) {
    return <p className="text-sm text-amber-600">No active {roleLabel} accounts exist yet. Invite one from Admin → Staff.</p>;
  }

  return (
    <form method="get" className="max-w-sm space-y-3">
      <div>
        <label className="block text-sm font-medium text-slate-700">{roleLabel}</label>
        <select
          name="staff"
          required
          defaultValue=""
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        >
          <option value="" disabled>
            Select {roleLabel.toLowerCase()}…
          </option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
      >
        Continue
      </button>
    </form>
  );
}
