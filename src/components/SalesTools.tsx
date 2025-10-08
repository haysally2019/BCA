import React, { useState, useEffect } from 'react';
import { Calculator, FileText, Mail, Calendar, PhoneCall, BarChart3, Download, Copy, Send, Clock, DollarSign, TrendingUp, Users, Zap, Target, Award, CheckCircle, CreditCard as Edit, Plus, Save, X, Trash2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';

interface SalesToolContent {
  id: string;
  content_type: 'email_template' | 'call_script' | 'competitor_feature';
  title: string;
  content: string;
  metadata: any;
  display_order: number;
  is_active: boolean;
}

const SalesTools: React.FC = () => {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [emailTemplates, setEmailTemplates] = useState<SalesToolContent[]>([]);
  const [callScripts, setCallScripts] = useState<SalesToolContent[]>([]);
  const [competitorFeatures, setCompetitorFeatures] = useState<SalesToolContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editingItem, setEditingItem] = useState<SalesToolContent | null>(null);
  const [editForm, setEditForm] = useState({ title: '', content: '', metadata: {} });

  const { profile } = useAuthStore();

  const isManager = profile?.user_role === 'admin' ||
                    profile?.user_role === 'manager' ||
                    profile?.subscription_plan === 'enterprise';

  useEffect(() => {
    fetchSalesTools();
  }, []);

  const fetchSalesTools = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('sales_tools_content')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;

      if (data) {
        setEmailTemplates(data.filter(item => item.content_type === 'email_template'));
        setCallScripts(data.filter(item => item.content_type === 'call_script'));
        setCompetitorFeatures(data.filter(item => item.content_type === 'competitor_feature'));
      }
    } catch (error) {
      console.error('Error fetching sales tools:', error);
      toast.error('Failed to load sales tools');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: SalesToolContent) => {
    setEditingItem(item);
    setEditForm({
      title: item.title,
      content: item.content,
      metadata: item.metadata || {}
    });
    setEditMode(true);
  };

  const handleSave = async () => {
    if (!editingItem) return;

    try {
      const { error } = await supabase
        .from('sales_tools_content')
        .update({
          title: editForm.title,
          content: editForm.content,
          metadata: editForm.metadata,
          updated_at: new Date().toISOString(),
          updated_by: profile?.id
        })
        .eq('id', editingItem.id);

      if (error) throw error;

      toast.success('Content updated successfully');
      setEditMode(false);
      setEditingItem(null);
      fetchSalesTools();
    } catch (error) {
      console.error('Error updating content:', error);
      toast.error('Failed to update content');
    }
  };

  const handleAdd = async (contentType: 'email_template' | 'call_script' | 'competitor_feature') => {
    try {
      const newItem = {
        content_type: contentType,
        title: 'New Item',
        content: 'Content goes here...',
        metadata: contentType === 'competitor_feature'
          ? { blueCaller: true, competitor1: false, competitor2: false }
          : {},
        display_order: 999,
        is_active: true,
        created_by: profile?.id
      };

      const { data, error } = await supabase
        .from('sales_tools_content')
        .insert([newItem])
        .select()
        .single();

      if (error) throw error;

      toast.success('Item added successfully');
      fetchSalesTools();

      if (data) {
        handleEdit(data);
      }
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Failed to add item');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const { error } = await supabase
        .from('sales_tools_content')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      toast.success('Item deleted successfully');
      fetchSalesTools();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => toast.success('Copied to clipboard'))
      .catch(() => toast.error('Failed to copy'));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Sales Tools</h2>
        <p className="text-gray-600">Everything you need to close more deals</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mb-4">
            <Mail className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Email Templates</h3>
          <p className="text-sm text-gray-600 mb-4">Pre-written emails for every stage of the sales process</p>
          <button
            onClick={() => setActiveModal('email')}
            className="w-full bg-academy-blue-600 text-white py-2 px-4 rounded hover:bg-academy-blue-700 transition-colors"
          >
            View Templates
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center mb-4">
            <PhoneCall className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Call Scripts</h3>
          <p className="text-sm text-gray-600 mb-4">Proven scripts for cold calls, demos, and closing</p>
          <button
            onClick={() => setActiveModal('scripts')}
            className="w-full bg-academy-red-600 text-white py-2 px-4 rounded hover:bg-academy-red-700 transition-colors"
          >
            View Scripts
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mb-4">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Competitor Analysis</h3>
          <p className="text-sm text-gray-600 mb-4">Feature comparison with other CRM solutions</p>
          <button
            onClick={() => setActiveModal('competitor')}
            className="w-full bg-academy-blue-600 text-white py-2 px-4 rounded hover:bg-academy-blue-700 transition-colors"
          >
            View Comparison
          </button>
        </div>
      </div>

      {activeModal === 'email' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Email Templates</h3>
              <div className="flex items-center space-x-2">
                {isManager && (
                  <button
                    onClick={() => handleAdd('email_template')}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm flex items-center space-x-1 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add New</span>
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-6">
              {emailTemplates.map((template) => (
                <div key={template.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">{template.title}</h4>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleCopy(template.content)}
                        className="text-blue-600 hover:text-blue-700 text-sm flex items-center space-x-1"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </button>
                      {isManager && (
                        <>
                          <button
                            onClick={() => handleEdit(template)}
                            className="text-green-600 hover:text-green-700 text-sm flex items-center space-x-1"
                          >
                            <Edit className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDelete(template.id)}
                            className="text-red-600 hover:text-red-700 text-sm flex items-center space-x-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded text-sm whitespace-pre-line">
                    {template.content}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-6">
              <button
                onClick={() => setActiveModal(null)}
                className="bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'scripts' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Call Scripts</h3>
              <div className="flex items-center space-x-2">
                {isManager && (
                  <button
                    onClick={() => handleAdd('call_script')}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm flex items-center space-x-1 hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add New</span>
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-6">
              {callScripts.map((script) => (
                <div key={script.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">{script.title}</h4>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleCopy(script.content)}
                        className="text-blue-600 hover:text-blue-700 text-sm flex items-center space-x-1"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </button>
                      {isManager && (
                        <>
                          <button
                            onClick={() => handleEdit(script)}
                            className="text-green-600 hover:text-green-700 text-sm flex items-center space-x-1"
                          >
                            <Edit className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDelete(script.id)}
                            className="text-red-600 hover:text-red-700 text-sm flex items-center space-x-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded text-sm whitespace-pre-line">
                    {script.content}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-6">
              <button
                onClick={() => setActiveModal(null)}
                className="bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'competitor' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Competitor Comparison</h3>
              {isManager && (
                <button
                  onClick={() => handleAdd('competitor_feature')}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm flex items-center space-x-1 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Feature</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4">Feature</th>
                    <th className="text-center py-3 px-4 bg-red-50">Blue Caller AI</th>
                    <th className="text-center py-3 px-4">Competitor A</th>
                    <th className="text-center py-3 px-4">Competitor B</th>
                    {isManager && <th className="text-center py-3 px-4">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {competitorFeatures.map((feature) => (
                    <tr key={feature.id} className="border-b border-gray-100">
                      <td className="py-3 px-4 font-medium">{feature.title}</td>
                      <td className="text-center py-3 px-4 bg-red-50">
                        {feature.metadata?.blueCaller ? (
                          <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                        ) : (
                          <div className="w-5 h-5 bg-gray-300 rounded-full mx-auto"></div>
                        )}
                      </td>
                      <td className="text-center py-3 px-4">
                        {feature.metadata?.competitor1 ? (
                          <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                        ) : (
                          <div className="w-5 h-5 bg-gray-300 rounded-full mx-auto"></div>
                        )}
                      </td>
                      <td className="text-center py-3 px-4">
                        {feature.metadata?.competitor2 ? (
                          <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                        ) : (
                          <div className="w-5 h-5 bg-gray-300 rounded-full mx-auto"></div>
                        )}
                      </td>
                      {isManager && (
                        <td className="text-center py-3 px-4">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => handleEdit(feature)}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(feature.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-6">
              <button
                onClick={() => setActiveModal(null)}
                className="bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {editMode && editingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Edit {editingItem.content_type === 'competitor_feature' ? 'Feature' : 'Content'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {editingItem.content_type === 'email_template' ? 'Subject' : 'Title'}
                </label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {editingItem.content_type !== 'competitor_feature' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Content
                  </label>
                  <textarea
                    value={editForm.content}
                    onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                    rows={12}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  />
                </div>
              )}

              {editingItem.content_type === 'competitor_feature' && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Feature Availability
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={editForm.metadata?.blueCaller || false}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          metadata: { ...editForm.metadata, blueCaller: e.target.checked }
                        })}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">Blue Caller AI</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={editForm.metadata?.competitor1 || false}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          metadata: { ...editForm.metadata, competitor1: e.target.checked }
                        })}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">Competitor A</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={editForm.metadata?.competitor2 || false}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          metadata: { ...editForm.metadata, competitor2: e.target.checked }
                        })}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">Competitor B</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-6">
              <button
                onClick={() => {
                  setEditMode(false);
                  setEditingItem(null);
                }}
                className="bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>
              <button
                onClick={handleSave}
                className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesTools;
