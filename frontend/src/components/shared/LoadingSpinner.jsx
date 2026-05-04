export default function LoadingSpinner() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-6 h-6 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      <span className="text-indigo-600 font-medium text-sm">
        Consulting the AI advisor — this may take 30-60 seconds…
      </span>
    </div>
  )
}
