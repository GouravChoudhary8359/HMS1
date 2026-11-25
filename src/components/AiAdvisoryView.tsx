import { useState } from 'react';
import { AlertCircle, ArrowRight, Bot, ShieldAlert } from 'lucide-react';
import { apiFetch, ApiError } from '../lib/api';
import { SYMPTOM_CATALOG } from '../lib/hmsRules';
import type {
  DepartmentAdvisoryResult,
  PriorityAdvisoryResult,
  PriorityLevel,
} from '../lib/types';
import { StatusTag, statusToneFor } from './StatusTag';

interface AiAdvisoryViewProps {
  onApplyToBooking: (deptName: string, priority: PriorityLevel, symptomsSummary: string) => void;
  onNotify: (type: 'success' | 'error' | 'info', text: string) => void;
}

export function AiAdvisoryView({ onApplyToBooking, onNotify }: AiAdvisoryViewProps) {
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(['chest_pain']);
  const [freeText, setFreeText] = useState('');
  const [painScale, setPainScale] = useState(6);
  const [durationDays, setDurationDays] = useState(2);
  const [patientAge, setPatientAge] = useState(42);
  const [hasFever, setHasFever] = useState(false);
  const [isUrgentFlag, setIsUrgentFlag] = useState(false);

  const [deptResult, setDeptResult] = useState<DepartmentAdvisoryResult | null>(null);
  const [priorityResult, setPriorityResult] = useState<PriorityAdvisoryResult | null>(null);
  const [loading, setLoading] = useState(false);

  const toggleSymptom = (id: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const runAdvisory = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const [deptRes, prioRes] = await Promise.all([
        apiFetch<{ result: DepartmentAdvisoryResult }>('/api/ai/suggest-department', {
          method: 'POST',
          body: JSON.stringify({ symptomIds: selectedSymptoms, freeText }),
        }),
        apiFetch<{ result: PriorityAdvisoryResult }>('/api/ai/suggest-priority', {
          method: 'POST',
          body: JSON.stringify({
            symptomIds: selectedSymptoms,
            painScale,
            durationDays,
            patientAge,
            hasFever,
            isUrgentFlag,
          }),
        }),
      ]);
      setDeptResult(deptRes.result);
      setPriorityResult(prioRes.result);
    } catch (err) {
      onNotify('error', err instanceof ApiError ? err.message : 'Unable to evaluate advisory rules.');
    } finally {
      setLoading(false);
    }
  };

  const buildSymptomsSummary = () => {
    const labels = selectedSymptoms
      .map((id) => SYMPTOM_CATALOG.find((s) => s.id === id)?.label || id)
      .join(', ');
    return [labels, freeText.trim()].filter(Boolean).join(' — ');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold text-slate-900">
          Academic AI Triage &amp; Priority Advisory
        </h2>
        <p className="text-sm text-slate-600">
          Rule- and score-based decision support for department routing (FR-27) and appointment priority estimation (FR-28).
        </p>
      </div>

      {/* Mandatory Safety Disclaimer (Section 5.2) */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 leading-relaxed">
          <span className="font-semibold">Advisory Notice (Non-Diagnostic):</span> This module executes transparent academic scoring rules only. It does not perform medical diagnosis and never replaces evaluation by a qualified physician.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={runAdvisory}
          className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-5"
        >
          <div>
            <h3 className="font-display font-semibold text-slate-900">
              01. Select Reported Symptoms
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Choose one or more symptoms to compute department rule weights.
            </p>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SYMPTOM_CATALOG.map((sym) => {
                const checked = selectedSymptoms.includes(sym.id);
                return (
                  <label
                    key={sym.id}
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                      checked
                        ? 'bg-teal-50/70 border-teal-600 text-slate-900'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSymptom(sym.id)}
                      className="mt-0.5 accent-teal-700"
                    />
                    <span>
                      <span className="font-medium block">{sym.label}</span>
                      <span className="text-[11px] text-slate-500">{sym.category}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="ai-notes" className="block text-xs font-medium text-slate-700 mb-1">
              Additional Symptom Keywords (optional)
            </label>
            <input
              id="ai-notes"
              type="text"
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder="e.g. migraine, twisted knee, blurred vision..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700"
            />
          </div>

          <div className="pt-4 border-t border-slate-200">
            <h3 className="font-display font-semibold text-slate-900">
              02. Severity &amp; Priority Inputs
            </h3>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="ai-pain" className="block text-xs font-medium text-slate-700 mb-1">
                  Pain / Distress (1–10)
                </label>
                <input
                  id="ai-pain"
                  type="number"
                  min={0}
                  max={10}
                  value={painScale}
                  onChange={(e) => setPainScale(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="ai-days" className="block text-xs font-medium text-slate-700 mb-1">
                  Duration (Days)
                </label>
                <input
                  id="ai-days"
                  type="number"
                  min={0}
                  max={365}
                  value={durationDays}
                  onChange={(e) => setDurationDays(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label htmlFor="ai-age" className="block text-xs font-medium text-slate-700 mb-1">
                  Patient Age (Years)
                </label>
                <input
                  id="ai-age"
                  type="number"
                  min={0}
                  max={120}
                  value={patientAge}
                  onChange={(e) => setPatientAge(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-5 text-xs text-slate-700">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasFever}
                  onChange={(e) => setHasFever(e.target.checked)}
                  className="accent-teal-700"
                />
                <span>Elevated temperature / fever present</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isUrgentFlag}
                  onChange={(e) => setIsUrgentFlag(e.target.checked)}
                  className="accent-teal-700"
                />
                <span>Sudden acute onset / escalation flag</span>
              </label>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-60 rounded-lg cursor-pointer"
            >
              <Bot className="w-4 h-4" />
              <span>{loading ? 'Evaluating Rules...' : 'Run Advisory Analysis'}</span>
            </button>
          </div>
        </form>

        {/* Results Panel */}
        <div className="lg:col-span-5 space-y-5">
          {!deptResult || !priorityResult ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
              <AlertCircle className="w-6 h-6 text-slate-400 mx-auto" />
              <h3 className="mt-3 font-display font-semibold text-slate-900">
                Advisory Output Ready
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Select symptoms and severity inputs on the left, then click &ldquo;Run Advisory Analysis&rdquo; to inspect rule scores.
              </p>
            </div>
          ) : (
            <>
              {/* FR-27 Result */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200">
                  <div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                      FR-27 Department Suggestion
                    </div>
                    <h3 className="mt-1 text-xl font-display font-bold text-slate-900">
                      {deptResult.recommendedDepartment}
                    </h3>
                    <div className="text-xs text-slate-600 mt-0.5">
                      Code <span className="font-mono font-semibold">{deptResult.departmentCode}</span> ·{' '}
                      {deptResult.confidenceLabel}
                    </div>
                  </div>
                  <StatusTag label="Advisory" tone="accent" />
                </div>

                <div>
                  <div className="text-xs font-medium text-slate-700 mb-1.5">Matched Symptom Rules:</div>
                  <ul className="space-y-1 text-xs text-slate-600 list-disc pl-4">
                    {deptResult.matchedRules.map((rule, i) => (
                      <li key={i}>{rule}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="text-xs font-medium text-slate-700 mb-1.5">
                    Department Rule Scores:
                  </div>
                  <div className="space-y-1.5">
                    {deptResult.rankedDepartments.slice(0, 4).map((d) => (
                      <div key={d.departmentCode} className="flex items-center justify-between text-xs">
                        <span className="text-slate-700">{d.departmentName}</span>
                        <span className="font-mono font-semibold text-slate-900 tabular-nums">
                          {d.score} pts
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* FR-28 Result */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200">
                  <div>
                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                      FR-28 Appointment Priority
                    </div>
                    <h3 className="mt-1 text-xl font-display font-bold text-slate-900">
                      {priorityResult.suggestedPriority} Priority
                    </h3>
                    <div className="text-xs text-slate-600 mt-0.5 font-mono tabular-nums">
                      Total Rule Score: {priorityResult.totalScore} pts
                    </div>
                  </div>
                  <StatusTag
                    label={priorityResult.suggestedPriority}
                    tone={statusToneFor(priorityResult.suggestedPriority)}
                  />
                </div>

                <p className="text-xs text-slate-700 leading-relaxed">
                  {priorityResult.recommendedAction}
                </p>

                {priorityResult.matchedRules.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <div className="text-xs font-medium text-slate-700">Score Breakdown:</div>
                    {priorityResult.matchedRules.map((r, i) => (
                      <div key={i} className="flex items-center justify-between text-xs text-slate-600 gap-2">
                        <span>{r.rule}</span>
                        <span className="font-mono font-semibold text-slate-900 shrink-0 tabular-nums">
                          +{r.points}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() =>
                      onApplyToBooking(
                        deptResult.recommendedDepartment,
                        priorityResult.suggestedPriority,
                        buildSymptomsSummary()
                      )
                    }
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg cursor-pointer"
                  >
                    <span>Book Appointment with Suggested Dept</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
