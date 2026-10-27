import React, { useState } from 'react';
import {
  Button,
  Input,
  Select,
  Textarea,
  Badge,
  StatusBadge,
  Panel,
  Drawer,
  Modal,
  Skeleton,
  EmptyState,
  ErrorState,
  Stat,
  Tabs,
  Countdown,
  Avatar,
  Popover,
  DataTable,
  useToast,
} from '../components/ui';
import { Calendar, Layers, Bell, CheckCircle2 } from 'lucide-react';

export default function DevUiShowcase() {
  const { addToast } = useToast();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [targetDate] = useState(() => new Date(Date.now() + 45 * 60 * 1000));

  const sampleTableColumns = [
    { header: 'Room Name', field: 'name', sortable: true },
    { header: 'Building', field: 'building', sortable: true },
    { header: 'Capacity', field: 'capacity', sortable: true },
    {
      header: 'Status',
      field: 'status',
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  const sampleTableData = [
    { _id: '1', name: 'Turing Computer Lab A-101', building: 'Turing Block', capacity: 30, status: 'approved' },
    { _id: '2', name: 'Lovelace Seminar Hall', building: 'Main Hall', capacity: 60, status: 'pending' },
    { _id: '3', name: 'Robotics Lab R-10', building: 'Engineering', capacity: 20, status: 'no_show' },
    { _id: '4', name: 'Study Pod Knuth', building: 'Library', capacity: 4, status: 'completed' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-10">
      <div className="border-b border-line pb-5">
        <h1 className="font-heading font-bold text-3xl text-ink">
          SlotSync Component Showcase
        </h1>
        <p className="text-sm text-text-2 mt-1">
          Design tokens and reusable UI primitives from ENHANCE.md sections 2 & 4.
        </p>
      </div>

      {/* Buttons & Badges */}
      <Panel title="Buttons & Badges">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Primary Button</Button>
            <Button variant="secondary">Secondary Button</Button>
            <Button variant="ghost">Ghost Button</Button>
            <Button variant="danger">Danger Button</Button>
            <Button variant="primary" isLoading>Loading</Button>
            <Button variant="primary" size="sm">Small Size</Button>
          </div>

          <div className="border-t border-line pt-4 flex flex-wrap items-center gap-2.5">
            <Badge variant="free" dot>Free</Badge>
            <Badge variant="mine" dot>Your Booking</Badge>
            <Badge variant="pending" dot>Awaiting Approval</Badge>
            <Badge variant="booked">Occupied</Badge>
            <Badge variant="danger" dot>No Show</Badge>
            <Badge variant="neutral">Neutral</Badge>
          </div>

          <div className="border-t border-line pt-4 flex flex-wrap items-center gap-2">
            <StatusBadge status="approved" />
            <StatusBadge status="pending" />
            <StatusBadge status="checked_in" />
            <StatusBadge status="completed" />
            <StatusBadge status="rejected" />
            <StatusBadge status="cancelled" />
            <StatusBadge status="expired" />
            <StatusBadge status="no_show" />
          </div>
        </div>
      </Panel>

      {/* Interactive Controls & Modals */}
      <Panel title="Interactive Modals, Drawers & Toasts">
        <div className="flex flex-wrap items-center gap-4">
          <Button onClick={() => setDrawerOpen(true)}>Open Booking Drawer</Button>
          <Button variant="secondary" onClick={() => setModalOpen(true)}>
            Open Confirmation Modal
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              addToast('Slot booked successfully!', 'success', 4000, {
                label: 'Undo',
                onClick: () => addToast('Booking undone', 'info'),
              })
            }
          >
            Trigger Toast with Undo
          </Button>

          <Popover
            trigger={({ isOpen }) => (
              <Button variant="ghost" className="relative">
                <Bell className="w-4 h-4" />
                <span className="w-2 h-2 rounded-full bg-danger absolute top-2 right-2" />
              </Button>
            )}
          >
            {({ close }) => (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <span className="font-heading font-semibold text-xs text-ink">Notifications</span>
                  <button onClick={close} className="text-xs text-mine hover:underline">Close</button>
                </div>
                <p className="text-xs text-text-2">You have 1 pending lab approval waiting.</p>
              </div>
            )}
          </Popover>
        </div>
      </Panel>

      {/* Form Controls */}
      <Panel title="Form Inputs & Selects">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Input label="Room Purpose" placeholder="e.g. Distributed Systems Lab" helperText="3 to 200 characters required" />
          <Select
            label="Department"
            options={[
              { label: 'Computer Science', value: 'cs' },
              { label: 'Electrical Engineering', value: 'ee' },
              { label: 'Mechanical Engineering', value: 'me' },
            ]}
          />
          <Input label="With Error" defaultValue="Invalid Room" error="This room has a blackout conflict" />
        </div>
      </Panel>

      {/* Stats & Countdown */}
      <Panel title="Stats & Countdown">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat label="Total Bookings" value="214" delta="+12%" deltaType="positive" description="vs previous 30 days" />
          <Stat label="Utilization Rate" value="62%" delta="+4%" deltaType="positive" description="Active usage" />
          <Stat label="No-Show Rate" value="11%" delta="-2%" deltaType="positive" description="Released slots" />
          <div className="bg-surface border border-line rounded-panel p-5 space-y-2">
            <span className="text-xs font-semibold text-text-2 tracking-wide uppercase">Next Reservation</span>
            <div className="text-lg font-bold text-ink">
              <Countdown targetDate={targetDate} />
            </div>
            <p className="text-xs text-free font-medium">Check-in window opens soon</p>
          </div>
        </div>
      </Panel>

      {/* Tabs & DataTable */}
      <Panel
        title="Tabs & DataTable"
        actions={
          <Tabs
            tabs={[
              { id: 'upcoming', label: 'Upcoming', count: 3 },
              { id: 'past', label: 'Past', count: 12 },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
          />
        }
      >
        <DataTable columns={sampleTableColumns} data={sampleTableData} />
      </Panel>

      {/* Skeletons & Avatars */}
      <Panel title="Avatars, Skeletons & Empty State">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Avatar name="Priya Sharma" size="sm" />
            <Avatar name="Campus Admin" size="md" />
            <Avatar name="Dr. Sarah Jenkins" size="lg" />
            <Avatar name="Alan Turing" size="xl" />
          </div>

          <div className="space-y-2">
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>

          <EmptyState
            icon={Calendar}
            title="No upcoming reservations"
            description="You do not have any room bookings scheduled for today or tomorrow."
            actionLabel="Find a room"
            onAction={() => addToast('Navigating to Find a room...', 'info')}
          />
        </div>
      </Panel>

      {/* Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Study Room A-101"
        subtitle="Library 1st Floor • 4 seats"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button onClick={() => { setDrawerOpen(false); addToast('Booked 5 to 6 PM', 'success'); }}>Book 5 to 6 PM</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-3 bg-paper rounded-control border border-line">
            <span className="text-xs text-text-2 block">Selected Time</span>
            <span className="text-sm font-bold text-ink">Today, 5 to 6 PM (1 hour)</span>
          </div>
          <Input label="Booking Purpose" placeholder="Group study on Distributed Systems" />
          <p className="text-xs text-text-2">You have 2 of 3 slots remaining today.</p>
        </div>
      </Drawer>

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Cancel Reservation?"
        subtitle="This will immediately release the slot to the next waitlisted student."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Keep Booking</Button>
            <Button variant="danger" onClick={() => { setModalOpen(false); addToast('Booking cancelled and released to waitlist', 'info'); }}>Confirm Cancellation</Button>
          </>
        }
      >
        <p className="text-sm text-text-2">
          Are you sure you want to cancel your booking for Turing Computer Lab A-101?
        </p>
      </Modal>
    </div>
  );
}
