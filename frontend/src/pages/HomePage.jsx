import { Link } from 'react-router-dom';

function HomePage(){
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-blue-600 mb-4">FairSplit 🧾</h1>
        <p className="text-xl text-gray-600 mb-2">Split bills. Fairly. Live.</p>
        <p className="text-gray-500 mb-8">Upload a receipt, share the link, and let everyone claim what they had.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          to="/host"
          className="bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 text-center text-lg font-medium transition"
        >
          📋 Create a Bill
        </Link>
        <Link
          to="/join/demo"
          className="bg-gray-600 text-white px-8 py-4 rounded-lg hover:bg-gray-700 text-center text-lg font-medium transition"
        >
          🔗 Join a Bill
        </Link>
      </div>

      <p className="mt-12 text-sm text-gray-400 max-w-md text-center">
        No account needed. Just upload, share, and split.
      </p>
    </div>
  );
}

export default HomePage