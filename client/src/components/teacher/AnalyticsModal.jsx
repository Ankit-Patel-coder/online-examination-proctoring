// client/src/components/teacher/AnalyticsModal.jsx
// Visual performance metrics, pass rates, score distribution, and question difficulty rates.
import { useState, useEffect } from 'react';
import {
  BarChart2, Users, Award, TrendingUp, CheckCircle2,
  AlertTriangle, ShieldAlert, ArrowUpRight, HelpCircle
} from 'lucide-react';

import evaluationApi from '../../api/evaluationApi';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';

export default function AnalyticsModal({ exam, isOpen, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && exam) {
      loadAnalytics();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, exam]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await evaluationApi.getAnalytics(exam._id);
      setData(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch analytics.');
    } finally {
      setLoading(false);
    }
  };

  const overview = data?.overview || {};
  const distribution = data?.scoreDistribution || [];
  const questionAnalytics = data?.questionAnalytics || [];
  const proctoringSummary = data?.proctoringSummary || { totalEvents: 0, breakdown: {} };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Exam Analytics: ${exam?.title}`}>
      <div className="space-y-6 max-w-4xl w-full">
        {loading ? (
          <div className="py-16 flex justify-center">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        ) : (
          <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-surface-50 border border-surface-200 rounded-2xl p-4">
                <div className="flex items-center justify-between text-surface-500 mb-2">
                  <span className="text-xs font-semibold">Submissions</span>
                  <Users className="w-4 h-4 text-primary-500" />
                </div>
                <div className="text-2xl font-bold text-surface-900">
                  {overview.totalSubmissions || 0}
                </div>
                <span className="text-[11px] text-surface-400">Completed tests</span>
              </div>

              <div className="bg-surface-50 border border-surface-200 rounded-2xl p-4">
                <div className="flex items-center justify-between text-surface-500 mb-2">
                  <span className="text-xs font-semibold">Average Score</span>
                  <Award className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-bold text-emerald-600">
                  {overview.averageScore || 0}
                  <span className="text-xs font-normal text-surface-400"> / {data.exam?.maximumMarks}</span>
                </div>
                <span className="text-[11px] text-surface-400">Median: {overview.medianScore || 0}</span>
              </div>

              <div className="bg-surface-50 border border-surface-200 rounded-2xl p-4">
                <div className="flex items-center justify-between text-surface-500 mb-2">
                  <span className="text-xs font-semibold">Pass Rate</span>
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {overview.passRate || 0}%
                </div>
                <span className="text-[11px] text-surface-400">Threshold: 40%</span>
              </div>

              <div className="bg-surface-50 border border-surface-200 rounded-2xl p-4">
                <div className="flex items-center justify-between text-surface-500 mb-2">
                  <span className="text-xs font-semibold">Score Range</span>
                  <ArrowUpRight className="w-4 h-4 text-purple-500" />
                </div>
                <div className="text-2xl font-bold text-surface-900">
                  {overview.highestScore || 0}
                  <span className="text-xs font-normal text-surface-400"> / {overview.lowestScore || 0}</span>
                </div>
                <span className="text-[11px] text-surface-400">High / Low marks</span>
              </div>
            </div>

            {/* Score Distribution Bars */}
            <div className="bg-white border border-surface-200 rounded-2xl p-5 shadow-sm space-y-4">
              <h4 className="text-sm font-bold text-surface-900">Score Distribution</h4>
              <div className="space-y-3">
                {distribution.map(bucket => {
                  const maxCount = Math.max(...distribution.map(d => d.count), 1);
                  const percentage = Math.round((bucket.count / maxCount) * 100);

                  return (
                    <div key={bucket.range} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-surface-700">{bucket.range}</span>
                        <span className="font-bold text-surface-900">
                          {bucket.count} student{bucket.count === 1 ? '' : 's'}
                        </span>
                      </div>
                      <div className="w-full h-3 bg-surface-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary-500 to-indigo-600 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Question Accuracy & Difficulty Breakdown */}
            <div className="bg-white border border-surface-200 rounded-2xl p-5 shadow-sm space-y-4">
              <h4 className="text-sm font-bold text-surface-900">Question Performance & Accuracy</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-50 border-b border-surface-200 text-surface-500 font-semibold uppercase">
                    <tr>
                      <th className="px-4 py-2.5">Q#</th>
                      <th className="px-4 py-2.5">Question Text</th>
                      <th className="px-4 py-2.5">Type</th>
                      <th className="px-4 py-2.5">Max</th>
                      <th className="px-4 py-2.5">Success Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100">
                    {questionAnalytics.map(qa => (
                      <tr key={qa.questionId} className="hover:bg-surface-50/50">
                        <td className="px-4 py-3 font-bold text-surface-800">Q{qa.questionNumber}</td>
                        <td className="px-4 py-3 text-surface-700 max-w-xs truncate font-medium">
                          {qa.text}
                        </td>
                        <td className="px-4 py-3 text-surface-500">{qa.type.replace('_', ' ')}</td>
                        <td className="px-4 py-3 font-semibold text-surface-800">{qa.marks}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-surface-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  qa.accuracyPercentage >= 70
                                    ? 'bg-emerald-500'
                                    : qa.accuracyPercentage >= 40
                                    ? 'bg-amber-500'
                                    : 'bg-red-500'
                                }`}
                                style={{ width: `${qa.accuracyPercentage}%` }}
                              />
                            </div>
                            <span className="font-bold text-surface-800">{qa.accuracyPercentage}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Proctoring Summary */}
            <div className="bg-surface-50 border border-surface-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-surface-900 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-500" />
                  Proctoring Audit Summary
                </h4>
                <span className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200">
                  {proctoringSummary.totalEvents} Flagged Events
                </span>
              </div>

              {proctoringSummary.totalEvents === 0 ? (
                <p className="text-xs text-surface-500">
                  No integrity violations or proctoring flags recorded during this examination.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2 pt-1">
                  {Object.entries(proctoringSummary.breakdown).map(([type, count]) => (
                    <div
                      key={type}
                      className="bg-white border border-surface-200 rounded-xl px-3 py-1.5 text-xs text-surface-700 font-medium"
                    >
                      <span className="text-surface-500">{type.replace('_', ' ')}:</span>{' '}
                      <span className="font-bold text-red-600">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end pt-3 border-t border-surface-200">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
