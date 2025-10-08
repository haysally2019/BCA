import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  User,
  Phone
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { supabaseService, Appointment } from '../lib/supabaseService';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

const Calendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const { profile } = useAuthStore();

  useEffect(() => {
    if (profile) {
      fetchAppointments();
    }
  }, [profile, currentDate]);

  const fetchAppointments = async () => {
    if (!profile) return;

    try {
      setLoading(true);
      const appointmentsData = await supabaseService.getAppointments(profile.id);
      setAppointments(appointmentsData);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error('Error loading appointments');
    } finally {
      setLoading(false);
    }
  };

  const createSampleAppointments = async () => {
    if (!profile) return;

    try {
      // Check if appointments already exist
      if (appointments.length > 0) {
        toast.info('Sample appointments already exist');
        return;
      }

      // Get existing leads to associate with appointments
      const leads = await supabaseService.getLeads(profile.id);
      
      const sampleAppointments = [
        {
          title: leads[0] ? `Roof Inspection - ${leads[0].name}` : 'Roof Inspection - Smith Residence',
          description: 'Initial roof inspection for storm damage assessment',
          location: leads[0]?.address || '123 Oak Street, Springfield, IL',
          scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
          duration_minutes: 60,
          status: 'scheduled' as const,
          lead_id: leads[0]?.id
        },
        {
          title: leads[1] ? `Estimate Appointment - ${leads[1].name}` : 'Estimate Appointment - Johnson Property',
          description: 'Provide detailed estimate for roofing project',
          location: leads[1]?.address || '456 Pine Avenue, Springfield, IL',
          scheduled_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // Day after tomorrow
          duration_minutes: 90,
          status: 'confirmed' as const,
          lead_id: leads[1]?.id
        },
        {
          title: 'Follow-up Consultation',
          description: 'Follow-up consultation for roofing project',
          location: '789 Maple Drive, Springfield, IL',
          scheduled_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
          duration_minutes: 45,
          status: 'scheduled' as const
        }
      ];

      const createdAppointments = [];
      for (const appointmentData of sampleAppointments) {
        try {
          const appointment = await supabaseService.createAppointment(profile.id, appointmentData);
          createdAppointments.push(appointment);
        } catch (error) {
          console.log('Error creating sample appointment:', error);
        }
      }

      if (createdAppointments.length > 0) {
        setAppointments(createdAppointments);
      }
    } catch (error) {
      console.error('Error creating sample appointments:', error);
    }
  };

  const handleCreateAppointment = async (appointmentData: Partial<Appointment>) => {
    if (!profile) return;

    try {
      const newAppointment = await supabaseService.createAppointment(profile.id, appointmentData);
      setAppointments(prev => [...prev, newAppointment]);
      setShowAddModal(false);
      toast.success('Appointment created successfully!');
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast.error('Failed to create appointment');
    }
  };

  const handleUpdateAppointment = async (appointmentId: string, updates: Partial<Appointment>) => {
    try {
      const updatedAppointment = await supabaseService.updateAppointment(appointmentId, updates);
      setAppointments(prev => prev.map(apt => apt.id === appointmentId ? updatedAppointment : apt));
      toast.success('Appointment updated successfully!');
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast.error('Failed to update appointment');
    }
  };

  const getDaysInMonth = () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end });
  };

  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter(apt =>
      isSameDay(new Date(apt.scheduled_at), date)
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'no_show': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'consultation': return '💬';
      case 'estimate': return '📋';
      case 'inspection': return '🔍';
      case 'follow_up': return '📞';
      default: return '📅';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-academy-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-academy-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-academy-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Appointment</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {/* Calendar Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1 text-sm bg-academy-blue-100 text-academy-blue-700 rounded-lg hover:bg-academy-blue-200 transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="p-6">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {getDaysInMonth().map(date => {
              const dayAppointments = getAppointmentsForDate(date);
              const isToday = isSameDay(date, new Date());
              const isSelected = selectedDate && isSameDay(date, selectedDate);

              return (
                <div
                  key={date.toISOString()}
                  className={`min-h-[100px] p-2 border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                    isToday ? 'bg-academy-blue-50 border-academy-blue-200' : ''
                  } ${isSelected ? 'bg-academy-blue-100 border-academy-blue-300' : ''}`}
                  onClick={() => setSelectedDate(date)}
                >
                  <div className={`text-sm font-medium mb-1 ${
                    isToday ? 'text-academy-blue-600' :
                    isSameMonth(date, currentDate) ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {format(date, 'd')}
                  </div>

                  <div className="space-y-1">
                    {dayAppointments.slice(0, 2).map(apt => (
                      <div
                        key={apt.id}
                        className="text-xs p-1 rounded bg-academy-blue-100 text-academy-blue-800 truncate"
                        title={`${apt.title} - ${apt.lead?.name || 'No contact'}`}
                      >
                        {getTypeIcon(apt.appointment_type?.name || 'appointment')} {format(new Date(apt.scheduled_at), 'HH:mm')}
                      </div>
                    ))}
                    {dayAppointments.length > 2 && (
                      <div className="text-xs text-gray-500">
                        +{dayAppointments.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Date Details */}
      {selectedDate && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </h3>
          </div>

          <div className="p-6">
            {getAppointmentsForDate(selectedDate).length === 0 ? (
              <div className="text-center py-8">
                <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No appointments scheduled for this date</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="mt-4 bg-academy-blue-600 text-white px-4 py-2 rounded-lg hover:bg-academy-blue-700 transition-colors"
                >
                  Schedule Appointment
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {getAppointmentsForDate(selectedDate).map(apt => (
                  <div key={apt.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">{getTypeIcon(apt.appointment_type?.name || 'appointment')}</div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{apt.title}</h4>
                          <p className="text-sm text-gray-600">{apt.description}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(apt.status)}`}>
                        {apt.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4" />
                        <span>
                          {format(new Date(apt.scheduled_at), 'h:mm a')}
                          ({apt.duration_minutes} min)
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4" />
                        <span>{apt.lead?.name || 'No contact assigned'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4" />
                        <span>{apt.lead?.phone || 'No phone'}</span>
                      </div>
                      {apt.location && (
                        <div className="flex items-center space-x-2 md:col-span-3">
                          <MapPin className="w-4 h-4" />
                          <span>{apt.location}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex items-center space-x-2">
                      <select
                        value={apt.status}
                        onChange={(e) => handleUpdateAppointment(apt.id, { status: e.target.value as Appointment['status'] })}
                        className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-academy-blue-500 focus:border-academy-blue-500"
                      >
                        <option value="scheduled">Scheduled</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="no_show">No Show</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Appointment Modal */}
      {showAddModal && (
        <AddAppointmentModal
          onClose={() => setShowAddModal(false)}
          onSave={handleCreateAppointment}
          selectedDate={selectedDate}
        />
      )}
    </div>
  );
};

interface AddAppointmentModalProps {
  onClose: () => void;
  onSave: (appointmentData: any) => void;
  selectedDate: Date | null;
}

const AddAppointmentModal: React.FC<AddAppointmentModalProps> = ({ onClose, onSave, selectedDate }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    scheduled_at: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    scheduled_time: '09:00',
    duration_minutes: '60',
    status: 'scheduled'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const scheduledDateTime = new Date(`${formData.scheduled_at}T${formData.scheduled_time}`);

    onSave({
      title: formData.title,
      description: formData.description,
      location: formData.location,
      scheduled_at: scheduledDateTime.toISOString(),
      duration_minutes: parseInt(formData.duration_minutes),
      status: formData.status,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Schedule New Appointment</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academy-blue-500 focus:border-academy-blue-500"
              placeholder="Roof inspection appointment"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academy-blue-500 focus:border-academy-blue-500"
              placeholder="Details about the appointment..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academy-blue-500 focus:border-academy-blue-500"
              placeholder="123 Main St, City, State"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input
                type="date"
                required
                value={formData.scheduled_at}
                onChange={(e) => setFormData(prev => ({ ...prev, scheduled_at: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academy-blue-500 focus:border-academy-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time *</label>
              <input
                type="time"
                required
                value={formData.scheduled_time}
                onChange={(e) => setFormData(prev => ({ ...prev, scheduled_time: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academy-blue-500 focus:border-academy-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
              <select
                value={formData.duration_minutes}
                onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academy-blue-500 focus:border-academy-blue-500"
              >
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">1 hour</option>
                <option value="90">1.5 hours</option>
                <option value="120">2 hours</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-academy-blue-500 focus:border-academy-blue-500"
              >
                <option value="scheduled">Scheduled</option>
                <option value="confirmed">Confirmed</option>
              </select>
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-academy-blue-600 text-white py-2 px-4 rounded-lg hover:bg-academy-blue-700 transition-colors"
            >
              Schedule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Calendar;