import React, { useState } from 'react';
import { X, Calendar, Clock, Building, Users, AlertCircle, ShieldAlert } from 'lucide-react';
import Spinner from './Spinner';

export default function BookingModal({
  isOpen,
  room,
  date,
  slot,
  isLoading,
  error,
  errorCode,
  onClose,
  onSubmit,
  onJoinWaitlistFromConflict,
}) {
  const [purpose, setPurpose] = useState('');

  if (!isOpen || !room || slot === null) return null;

  const slotStartHour = `${String(slot).padStart(2, '0')}:00`;
  const slotEndHour = `${String(slot + 1).padStart(2, '0')}:00`;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (purpose.trim().length < 3) return;
    onSubmit(purpose.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100">
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Confirm Reservation</h3>
            <p className="text-xs text-slate-500 mt-0.5">Please review your booking details below</p>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Room & Slot Info Card */}
        <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-900">{room.name}</span>
            {room.requiresApproval && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                Approval Required
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <span>{room.building}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>Capacity: {room.capacity} seats</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{date}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-slate-900">
                {slotStartHour} - {slotEndHour}
              </span>
            </div>
          </div>
        </div>

        {room.requiresApproval && (
          <div className="mt-3 flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs leading-relaxed">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              This room requires departmental authorization. Your request will be placed in the
              pending queue until reviewed by an administrator.
            </p>
          </div>
        )}

        {/* Error notification banner */}
        {error && (
          <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>

            {/* If slot was taken concurrently, offer waitlist directly! */}
            {errorCode === 'SLOT_TAKEN' && (
              <div className="pt-2 border-t border-rose-200/60 flex justify-end">
                <button
                  type="button"
                  onClick={onJoinWaitlistFromConflict}
                  className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 transition-colors shadow-2xs"
                >
                  Join Waitlist for this Slot
                </button>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Booking Purpose / Notes <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. CS401 Senior Capstone Group Discussion"
              minLength={3}
              maxLength={200}
              className="w-full text-sm rounded-xl border border-slate-300 p-3 focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            />
            <span className="text-[10px] text-slate-400 mt-1 block text-right">
              {purpose.length}/200 characters
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || purpose.trim().length < 3}
              className="px-5 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors shadow-xs disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading && <Spinner size="sm" />}
              {isLoading ? 'Reserving...' : room.requiresApproval ? 'Submit Request' : 'Confirm Reservation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
