'use client';

import React, { useState } from 'react';
import { ShieldCheck, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { PrioritizedShipmentDetail, ActionType, OverrideRequest } from '../lib/types';

interface ManualOverrideModalProps {
  shipment: PrioritizedShipmentDetail;
  isOpen: boolean;
  onClose: () => void;
  onSubmitOverride: (req: OverrideRequest) => Promise<void>;
}

export const ManualOverrideModal: React.FC<ManualOverrideModalProps> = ({
  shipment,
  isOpen,
  onClose,
  onSubmitOverride,
}) => {
  const [newScore, setNewScore] = useState<number>(95);
  const [newAction, setNewAction] = useState<ActionType>('COLLECT NOW');
  const [operatorId, setOperatorId] = useState<string>('DISPATCH-OPERATOR-1');
  const [reason, setReason] = useState<string>('Farmer reported on-site cooler failure. High value batch requires immediate emergency pickup.');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmitOverride({
        shipment_id: shipment.shipment_id,
        overridden_priority_score: Number(newScore),
        overridden_action: newAction,
        reason: reason.trim(),
        operator_id: operatorId.trim() || 'DISPATCH-OPERATOR-1',
      });
      setSuccessMessage('Priority override successfully applied and recorded in audit log.');
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 1200);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Authorized Operator Priority Override
              </h3>
              <p className="text-xs text-slate-500">
                Demo Mode • Adjust dispatch order and record rationale
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 font-semibold">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Current State Summary */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1.5">
            <div className="flex justify-between font-semibold text-slate-700">
              <span>Target Shipment:</span>
              <span className="font-mono text-slate-900">{shipment.shipment_id} ({shipment.producer_id})</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Current Score & Action:</span>
              <span className="font-semibold text-slate-900">
                {shipment.priority_score.toFixed(1)} / 100 • {shipment.recommended_action}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Remaining Thermal Life:</span>
              <span className="font-medium text-slate-800">{shipment.remaining_thermal_life_hours.toFixed(1)} hours</span>
            </div>
          </div>

          {/* New Priority Score Slider */}
          <div>
            <div className="flex items-center justify-between mb-1.5 text-xs font-semibold text-slate-700">
              <label htmlFor="score-input">New Priority Score (0–100):</label>
              <span className="font-mono text-sm font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                {newScore.toFixed(1)}
              </span>
            </div>
            <input
              id="score-input"
              type="range"
              min="0"
              max="100"
              step="1"
              value={newScore}
              onChange={(e) => setNewScore(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-600 font-medium mt-1">
              <span>0 (Lowest)</span>
              <span>50 (Normal)</span>
              <span>100 (Emergency Expedite)</span>
            </div>
          </div>

          {/* Recommended Action Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Assigned Dispatch Action:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['COLLECT NOW', 'PRIORITIZE', 'MONITOR', 'NORMAL'] as ActionType[]).map((act) => (
                <button
                  type="button"
                  key={act}
                  onClick={() => setNewAction(act)}
                  className={`py-2 px-2 text-xs font-bold rounded-lg border text-center transition-all ${
                    newAction === act
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {act}
                </button>
              ))}
            </div>
          </div>

          {/* Operator Identifier */}
          <div>
            <label htmlFor="operator-id-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Operator Identifier / Call Sign:
            </label>
            <input
              id="operator-id-input"
              type="text"
              value={operatorId}
              onChange={(e) => setOperatorId(e.target.value)}
              placeholder="e.g. DISPATCH-LEAD-1"
              className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Justification / Reason */}
          <div>
            <label htmlFor="reason-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Operator Justification / Operational Reason:
            </label>
            <textarea
              id="reason-input"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              placeholder="Specify the reason for overriding algorithmic routing order..."
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Notice Alert */}
          <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Overrides immediately elevate this shipment to the front of the proposed dispatch route. The action is audited with timestamp.
            </span>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !reason.trim()}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-500/20 disabled:opacity-50 transition-all"
            >
              {isSubmitting ? 'Recording Override...' : 'Confirm Priority Override'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
