'use client';

import { useState } from 'react';

interface Issue {
  type: string;
  severity: string;
  description: string;
  count: number;
}

interface AnalysisResult {
  url: string;
  score: number;
  issues: Issue[];
  timestamp: string;
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');

  const handleAnalyze = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erreur lors de l\'analyse');
      }

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!result) return;

    try {
      const res = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      });

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `rapport-accessibilite-${Date.now()}.pdf`;
      link.click();
    } catch (err) {
      alert('Erreur lors du téléchargement du PDF');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600';
      case 'moderate': return 'text-orange-600';
      case 'minor': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">Accessibility Checker</h1>
          <p className="text-xl text-gray-700">Analysez l'accessibilité de votre site web en quelques secondes</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex gap-4">
            <input
              type="url"
              placeholder="https://exemple.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleAnalyze}
              disabled={loading || !url}
              className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Analyse en cours...' : 'Analyser'}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}
        </div>

        {result && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Score : {result.score}/100</h2>
                <p className="text-gray-600 mt-1">Analysé le {new Date(result.timestamp).toLocaleString('fr-FR')}</p>
              </div>
              <button
                onClick={handleDownloadPDF}
                className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
              >
                📥 Télécharger le rapport PDF
              </button>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">Problèmes détectés</h3>

              {result.issues.length === 0 ? (
                <p className="text-green-600 font-medium">✅ Aucun problème majeur détecté !</p>
              ) : (
                <ul className="space-y-4">
                  {result.issues.map((issue, index) => (
                    <li key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-gray-900">{issue.type}</h4>
                          <p className="text-gray-700 mt-1">{issue.description}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSeverityColor(issue.severity)}`}>
                          {issue.severity}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                ℹ️ Ce rapport est fourni à titre indicatif. Il ne constitue pas une certification WCAG/RGAA officielle.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
