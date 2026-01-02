import { AlertTriangle } from 'lucide-react';

export default function SystemDisabled() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-2xl p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-12 h-12 text-red-600" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            System Temporarily Disabled
          </h1>

          <p className="text-gray-600 mb-6 leading-relaxed">
            The sales portal is currently unavailable for maintenance.
            We apologize for any inconvenience this may cause.
          </p>

          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <p className="text-sm text-gray-700 mb-2 font-medium">
              Need Access?
            </p>
            <p className="text-sm text-gray-600">
              Please contact the developer to reinstate the portal.
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Thank you for your patience and understanding.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
