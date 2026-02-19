import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ToggleLeft, ToggleRight, Info } from 'lucide-react';
import api from '../../services/api';

interface Feature {
  key: string;
  name: string;
  description: string;
}

export default function FeatureManager() {
  const navigate = useNavigate();
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
      navigate('/admin/login');
      return;
    }
    fetchFeatures();
  }, [navigate]);

  const fetchFeatures = async () => {
    try {
      const response = await api.get('/admin/features');
      setFeatures(response.data);
    } catch (err) {
      console.error('Failed to fetch features:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/admin/dashboard" className="text-gray-400 hover:text-white">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-white font-bold">Available Features</h1>
            <p className="text-gray-400 text-sm">Features that can be enabled/disabled per family</p>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="p-4 bg-gray-700 border-b border-gray-600">
            <p className="text-gray-300 text-sm flex items-center gap-2">
              <Info size={16} />
              These features can be toggled on/off for each family from the Family Details page.
            </p>
          </div>

          <div className="divide-y divide-gray-700">
            {features.map((feature) => (
              <div key={feature.key} className="p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">{feature.name}</h3>
                  <p className="text-gray-400 text-sm">{feature.description}</p>
                  <code className="text-xs text-purple-400 mt-1 inline-block">
                    {feature.key}
                  </code>
                </div>
                <div className="text-green-400">
                  <ToggleRight size={24} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 bg-gray-800 rounded-lg p-4">
          <h3 className="text-white font-semibold mb-2">How to manage features per family:</h3>
          <ol className="text-gray-400 text-sm space-y-2 list-decimal list-inside">
            <li>Go to <Link to="/admin/families" className="text-purple-400 hover:underline">Family Management</Link></li>
            <li>Click on the Settings icon for a specific family</li>
            <li>Toggle features on/off for that family</li>
            <li>Changes take effect immediately</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
