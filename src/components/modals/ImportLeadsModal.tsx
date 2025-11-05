import React, { useState } from 'react';
import { Upload, X, Download, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import BaseModal from './BaseModal';
import toast from 'react-hot-toast';

interface ImportLeadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (leads: any[]) => Promise<{ success: number; failed: number; duplicates: number; dbDuplicates: number }>;
}

interface CSVColumn {
  csvHeader: string;
  mappedField: string | null;
  sampleData: string;
}

interface ImportResult {
  success: number;
  failed: number;
  duplicates: number;
  dbDuplicates: number;
  errors: Array<{ row: number; error: string; data: any }>;
}

const FIELD_OPTIONS = [
  { value: '', label: 'Skip this column' },
  { value: 'name', label: 'Name / Contact Name (Required)', required: true },
  { value: 'company_name', label: 'Company Name' },
  { value: 'contact_name', label: 'Contact Name' },
  { value: 'phone', label: 'Phone (Required)', required: true },
  { value: 'email', label: 'Email' },
  { value: 'address', label: 'Address' },
  { value: 'status', label: 'Status' },
  { value: 'score', label: 'Score / Probability' },
  { value: 'probability', label: 'Probability' },
  { value: 'estimated_value', label: 'Estimated Value / Deal Value' },
  { value: 'deal_value', label: 'Deal Value' },
  { value: 'roof_type', label: 'Roof Type' },
  { value: 'source', label: 'Source' },
  { value: 'company_size', label: 'Company Size' },
  { value: 'current_crm', label: 'Current CRM' },
  { value: 'pain_points', label: 'Pain Points' },
  { value: 'decision_maker', label: 'Decision Maker' },
  { value: 'notes', label: 'Notes' },
];

const VALID_STATUSES = ['new', 'contacted', 'qualified', 'won', 'lost'];
const MAX_IMPORT_LEADS = 100;

export const ImportLeadsModal: React.FC<ImportLeadsModalProps> = ({ isOpen, onClose, onImport }) => {
  const [file, setFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<CSVColumn[]>([]);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [step, setStep] = useState<'upload' | 'mapping' | 'processing' | 'results'>('upload');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        toast.error('Please select a CSV file');
        return;
      }
      setFile(selectedFile);
      parseCSV(selectedFile);
    }
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;

        if (!text || text.trim().length === 0) {
          toast.error('CSV file is empty');
          setFile(null);
          return;
        }

        const lines = text.split(/\r?\n/).filter(line => line.trim());

        if (lines.length < 2) {
          toast.error('CSV file must contain a header row and at least one data row');
          setFile(null);
          return;
        }

        const parsedData = lines.map(line => parseCSVLine(line));
        const headers = parsedData[0];
        const dataRows = parsedData.slice(1).filter(row => row.some(cell => cell.trim()));

        if (dataRows.length === 0) {
          toast.error('No valid data rows found in CSV file');
          setFile(null);
          return;
        }

        if (dataRows.length > MAX_IMPORT_LEADS) {
          toast.error(`Maximum ${MAX_IMPORT_LEADS} leads can be imported at once. Your file has ${dataRows.length} rows.`);
          setFile(null);
          return;
        }

        const detectedColumns: CSVColumn[] = headers.map((header, index) => ({
          csvHeader: header,
          mappedField: detectFieldMapping(header),
          sampleData: dataRows[0]?.[index] || '',
        }));

        setColumns(detectedColumns);
        setCsvData(dataRows);
        setStep('mapping');
        toast.success(`CSV file loaded successfully with ${dataRows.length} row${dataRows.length > 1 ? 's' : ''}`);
      } catch (error) {
        console.error('Error parsing CSV:', error);
        toast.error('Error parsing CSV file. Please check the file format.');
        setFile(null);
      }
    };

    reader.onerror = () => {
      toast.error('Error reading CSV file');
      setFile(null);
    };

    reader.readAsText(file);
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());

    return result;
  };

  const detectFieldMapping = (header: string): string | null => {
    const normalized = header.toLowerCase().trim();

    if (normalized.includes('company') && normalized.includes('name')) return 'company_name';
    if (normalized.includes('contact') && normalized.includes('name')) return 'contact_name';
    if (normalized.includes('name') && !normalized.includes('company')) return 'name';
    if (normalized.includes('phone') || normalized.includes('mobile') || normalized.includes('tel')) return 'phone';
    if (normalized.includes('email') || normalized.includes('e-mail')) return 'email';
    if (normalized.includes('address') || normalized.includes('location')) return 'address';
    if (normalized.includes('status')) return 'status';
    if (normalized.includes('probability') || normalized.includes('prob')) return 'probability';
    if (normalized.includes('score') || normalized.includes('rating')) return 'score';
    if (normalized.includes('deal') && (normalized.includes('value') || normalized.includes('amount'))) return 'deal_value';
    if (normalized.includes('value') || normalized.includes('estimate') || normalized.includes('price')) return 'estimated_value';
    if (normalized.includes('roof') || normalized.includes('type')) return 'roof_type';
    if (normalized.includes('source') || normalized.includes('origin')) return 'source';
    if (normalized.includes('company') && normalized.includes('size')) return 'company_size';
    if (normalized.includes('crm')) return 'current_crm';
    if (normalized.includes('pain')) return 'pain_points';
    if (normalized.includes('decision')) return 'decision_maker';
    if (normalized.includes('note')) return 'notes';

    return null;
  };

  const handleFieldMappingChange = (columnIndex: number, field: string) => {
    setColumns(prev => prev.map((col, idx) =>
      idx === columnIndex ? { ...col, mappedField: field || null } : col
    ));
  };

  const validateMapping = (): boolean => {
    const mappedFields = columns.map(c => c.mappedField).filter(Boolean);
    const requiredFields = ['name', 'phone'];

    const missingFields = requiredFields.filter(field => !mappedFields.includes(field));

    if (missingFields.length > 0) {
      toast.error(`Please map required fields: ${missingFields.join(', ')}`);
      return false;
    }

    const duplicates = mappedFields.filter((field, idx) =>
      field && mappedFields.indexOf(field) !== idx
    );

    if (duplicates.length > 0) {
      toast.error('Each field can only be mapped once');
      return false;
    }

    return true;
  };

  const handleStartImport = async () => {
    if (!validateMapping()) return;

    setStep('processing');
    setIsProcessing(true);
    setProgress({ current: 0, total: csvData.length });

    const result: ImportResult = {
      success: 0,
      failed: 0,
      duplicates: 0,
      dbDuplicates: 0,
      errors: [],
    };

    const validLeads: any[] = [];
    const processedPhones = new Set<string>();

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      setProgress({ current: i + 1, total: csvData.length });

      try {
        const leadData: any = {};
        let hasRequiredFields = true;

        columns.forEach((col, colIndex) => {
          if (col.mappedField && row[colIndex]) {
            const value = row[colIndex].trim();

            switch (col.mappedField) {
              case 'name':
              case 'contact_name':
                leadData.name = value.replace(/[<>]/g, '');
                leadData.contact_name = value.replace(/[<>]/g, '');
                if (!value) hasRequiredFields = false;
                break;
              case 'company_name':
                leadData.company_name = value.replace(/[<>]/g, '');
                break;
              case 'phone':
                const cleanPhone = value.replace(/[^\d\s\-\(\)\+]/g, '');
                leadData.phone = cleanPhone;
                if (!cleanPhone || cleanPhone.replace(/\D/g, '').length < 10) {
                  throw new Error('Invalid phone number format');
                }
                break;
              case 'email':
                if (value && !isValidEmail(value)) {
                  throw new Error('Invalid email format');
                }
                leadData.email = value.toLowerCase();
                break;
              case 'status':
                const normalizedStatus = value.toLowerCase().replace(/\s+/g, '_');
                leadData.status = VALID_STATUSES.includes(normalizedStatus) ? normalizedStatus : 'new';
                break;
              case 'score':
              case 'probability':
                const numValue = parseInt(value);
                leadData.score = (!isNaN(numValue) && numValue >= 0 && numValue <= 100) ? numValue : 50;
                leadData.probability = (!isNaN(numValue) && numValue >= 0 && numValue <= 100) ? numValue : 50;
                break;
              case 'estimated_value':
              case 'deal_value':
                const dealVal = parseFloat(value.replace(/[,$]/g, ''));
                if (!isNaN(dealVal) && dealVal > 0) {
                  leadData.estimated_value = Math.round(dealVal);
                  leadData.deal_value = Math.round(dealVal);
                }
                break;
              case 'source':
                leadData.source = value.toLowerCase().replace(/\s+/g, '_') || 'import';
                break;
              case 'company_size':
                leadData.company_size = value.replace(/[<>]/g, '');
                break;
              case 'current_crm':
                leadData.current_crm = value.replace(/[<>]/g, '');
                break;
              case 'pain_points':
                leadData.pain_points = value.split(',').map(p => p.trim()).filter(p => p);
                break;
              case 'decision_maker':
                const boolValue = value.toLowerCase();
                leadData.decision_maker = boolValue === 'true' || boolValue === 'yes' || boolValue === '1';
                break;
              case 'address':
                leadData.address = value.replace(/[<>]/g, '');
                break;
              case 'notes':
                leadData.notes = value.replace(/[<>]/g, '');
                break;
              case 'roof_type':
                leadData.roof_type = value.replace(/[<>]/g, '');
                break;
              default:
                leadData[col.mappedField] = value.replace(/[<>]/g, '');
            }
          }
        });

        if (!hasRequiredFields) {
          throw new Error('Missing required fields (name or phone)');
        }

        // Check for duplicates within the CSV file itself
        const normalizedPhone = leadData.phone.replace(/\D/g, '');
        if (processedPhones.has(normalizedPhone)) {
          result.duplicates++;
          result.errors.push({
            row: i + 2,
            error: 'Duplicate phone number in CSV',
            data: row,
          });
          continue;
        }

        processedPhones.add(normalizedPhone);

        if (!leadData.status) leadData.status = 'new';
        if (!leadData.score) leadData.score = 50;
        if (!leadData.source) leadData.source = 'import';

        validLeads.push(leadData);

      } catch (error: any) {
        result.failed++;
        result.errors.push({
          row: i + 2,
          error: error.message || 'Unknown error',
          data: row,
        });
      }
    }

    try {
      if (validLeads.length > 0) {
        // Use the onImport callback which will handle the bulk insert
        const importResults = await onImport(validLeads);

        // Update result with actual database results
        result.success = importResults.success;
        result.dbDuplicates = importResults.dbDuplicates;

        // Keep track of CSV duplicates separately
        // (these are already counted in result.duplicates from the loop above)

        if (importResults.success > 0) {
          toast.success(`Successfully imported ${importResults.success} lead${importResults.success > 1 ? 's' : ''}`);
        }
      } else {
        toast.error('No valid leads to import');
      }
    } catch (error: any) {
      console.error('Import error:', error);
      const errorMessage = error.message || 'Unknown error';
      toast.error('Failed to import leads: ' + errorMessage);

      // Check if error has import results attached
      if (error.importResults) {
        result.success = error.importResults.success;
        result.failed = error.importResults.failed;
        result.dbDuplicates = error.importResults.dbDuplicates;
      }

      // If there's an error object with details, add to errors list
      if (error.details) {
        result.errors.push({
          row: 0,
          error: `Database error: ${errorMessage}`,
          data: error.details,
        });
      }

      // Only override failed count if no results were attached
      if (!error.importResults) {
        result.failed = validLeads.length;
        result.success = 0;
      }
    }

    setImportResult(result);
    setStep('results');
    setIsProcessing(false);
  };

  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const downloadTemplate = () => {
    const template = 'Company Name,Contact Name,Phone,Email,Status,Probability,Deal Value,Source,Company Size,Current CRM,Pain Points,Decision Maker,Notes\n' +
      'Elite Roofing Co.,John Smith,(555) 123-4567,john@eliteroofing.com,qualified,75,199,website,10-50 employees,None,"Lead management, Follow-up tracking",yes,Interested in comprehensive training program\n' +
      'Apex Roofing Solutions,Jane Doe,(555) 987-6543,jane@apexroofing.com,lead,60,299,referral,51-200 employees,HubSpot,"Team training, Sales process",no,Needs approval from owner';

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'prospects_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };

  const downloadErrors = () => {
    if (!importResult || importResult.errors.length === 0) return;

    const errorCSV = [
      ['Row Number', 'Error', ...columns.map(c => c.csvHeader)].join(','),
      ...importResult.errors.map(err =>
        [err.row, `"${err.error}"`, ...err.data.map((d: string) => `"${d}"`)].join(',')
      )
    ].join('\n');

    const blob = new Blob([errorCSV], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import_errors_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Error report downloaded');
  };

  const handleClose = () => {
    if (isProcessing) {
      toast.error('Please wait for the import to complete');
      return;
    }
    setFile(null);
    setColumns([]);
    setCsvData([]);
    setStep('upload');
    setImportResult(null);
    setProgress({ current: 0, total: 0 });
    setIsProcessing(false);
    onClose();
  };

  const renderUploadStep = () => (
    <div className="space-y-4">
      <div className="text-center">
        <div className="mb-4">
          <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Import Leads from CSV</h3>
          <p className="text-sm text-gray-600 mb-3">
            Upload a CSV file with your lead data. Maximum {MAX_IMPORT_LEADS} leads per import.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-left">
            <p className="text-xs font-medium text-blue-900 mb-2">CSV Requirements:</p>
            <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
              <li>Required fields: Name and Phone</li>
              <li>First row must contain column headers</li>
              <li>Use standard CSV format with commas</li>
              <li>Download the template below for guidance</li>
            </ul>
          </div>
        </div>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-red-400 transition-colors">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
            id="csv-upload"
          />
          <label
            htmlFor="csv-upload"
            className="cursor-pointer flex flex-col items-center space-y-2"
          >
            <div className="bg-red-100 p-3 rounded-full">
              <Upload className="w-6 h-6 text-red-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">
              Click to select a CSV file
            </span>
            <span className="text-xs text-gray-500">or drag and drop</span>
          </label>
        </div>

        <div className="mt-6">
          <button
            onClick={downloadTemplate}
            className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center space-x-2 mx-auto"
          >
            <Download className="w-4 h-4" />
            <span>Download CSV Template</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderMappingStep = () => (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-900">Map Your CSV Columns</h4>
            <p className="text-sm text-blue-700 mt-1">
              Match your CSV columns to lead fields. Name and Phone are required.
              Found {csvData.length} rows to import.
            </p>
          </div>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-sm font-medium text-gray-700">
            <div>CSV Column</div>
            <div>Map to Field</div>
            <div>Sample Data</div>
          </div>
        </div>
        <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
          {columns.map((column, index) => (
            <div key={index} className="px-4 py-3 hover:bg-gray-50">
              <div className="grid grid-cols-3 gap-4 items-center">
                <div className="font-medium text-sm text-gray-900">
                  {column.csvHeader}
                </div>
                <div>
                  <select
                    value={column.mappedField || ''}
                    onChange={(e) => handleFieldMappingChange(index, e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    {FIELD_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="text-sm text-gray-600 truncate" title={column.sampleData}>
                  {column.sampleData || '(empty)'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between pt-4">
        <button
          onClick={() => setStep('upload')}
          className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleStartImport}
          className="bg-red-700 text-white px-6 py-2 rounded-lg hover:bg-red-800 transition-colors font-medium"
        >
          Start Import
        </button>
      </div>
    </div>
  );

  const renderProcessingStep = () => (
    <div className="space-y-4 text-center py-8">
      <Loader className="w-16 h-16 text-red-600 mx-auto animate-spin" />
      <h3 className="text-lg font-semibold text-gray-900">Importing Leads...</h3>
      <p className="text-sm text-gray-600">
        Processing row {progress.current} of {progress.total}
      </p>
      <div className="w-full bg-gray-200 rounded-full h-2 max-w-md mx-auto">
        <div
          className="bg-red-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${(progress.current / progress.total) * 100}%` }}
        />
      </div>
    </div>
  );

  const renderResultsStep = () => (
    <div className="space-y-4">
      <div className="text-center py-4">
        {importResult && importResult.success > 0 ? (
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
        ) : (
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
        )}
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Import Complete</h3>
      </div>

      {importResult && (
        <div className="space-y-3">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-green-900">Successfully imported</span>
              <span className="text-lg font-bold text-green-600">{importResult.success}</span>
            </div>
          </div>

          {importResult.duplicates > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-yellow-900">Duplicates in CSV (skipped)</span>
                <span className="text-lg font-bold text-yellow-600">{importResult.duplicates}</span>
              </div>
            </div>
          )}

          {importResult.dbDuplicates > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-orange-900">Already exist in database (skipped)</span>
                <span className="text-lg font-bold text-orange-600">{importResult.dbDuplicates}</span>
              </div>
            </div>
          )}

          {importResult.failed > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-red-900">Failed to import</span>
                <span className="text-lg font-bold text-red-600">{importResult.failed}</span>
              </div>
              {importResult.errors.length > 0 && (
                <div className="mt-3">
                  <button
                    onClick={downloadErrors}
                    className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Error Report</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end pt-4">
        <button
          onClick={handleClose}
          className="bg-red-700 text-white px-6 py-2 rounded-lg hover:bg-red-800 transition-colors font-medium"
        >
          Done
        </button>
      </div>
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        step === 'upload' ? 'Import Leads' :
        step === 'mapping' ? 'Map Columns' :
        step === 'processing' ? 'Importing' :
        'Import Results'
      }
      size="lg"
    >
      {step === 'upload' && renderUploadStep()}
      {step === 'mapping' && renderMappingStep()}
      {step === 'processing' && renderProcessingStep()}
      {step === 'results' && renderResultsStep()}
    </BaseModal>
  );
};

export default ImportLeadsModal;
