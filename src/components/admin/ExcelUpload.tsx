import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  bulkUploadStudents,
  bulkUploadFaculty,
  bulkUploadProjects,
  StudentData,
  FacultyData,
  ProjectData
} from '@/lib/firebaseUtils';

interface ExcelUploadProps {
  onDataProcessed: () => void;
}

export const ExcelUpload: React.FC<ExcelUploadProps> = ({ onDataProcessed }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedType, setSelectedType] = useState<'students' | 'faculty' | 'projects'>('students');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus('idle');
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // Validate file type
      if (!file.name.match(/\.(xlsx|xls)$/i)) {
        throw new Error('Please upload a valid Excel file (.xlsx or .xls)');
      }

      // Read file
      console.log('📖 Reading Excel file...');
      const data = await readExcelFile(file);
      console.log('📊 Raw Excel data:', data);
      setUploadProgress(30);

      if (!data || data.length === 0) {
        throw new Error('The Excel file is empty or has no data');
      }

      // Process data based on type
      console.log(`🔄 Processing ${selectedType} data...`);
      console.log('🔍 Sample row from Excel:', data[0]);
      console.log('🔍 All column names found:', data[0] ? Object.keys(data[0]) : []);
      const processedData = processExcelData(data, selectedType);
      console.log('✅ Processed data:', processedData);
      console.log('📊 Total processed:', processedData.length);

      // Validate processed data
      const validData = processedData.filter((item: any) => {
        if (selectedType === 'faculty') {
          return item.name && item.email;
        } else if (selectedType === 'students') {
          return item.name && item.email && item.rollNo;
        } else {
          return item.title;
        }
      });

      if (validData.length === 0) {
        throw new Error(`No valid ${selectedType} data found. Please check the Excel format and column names.`);
      }

      console.log(`✅ Found ${validData.length} valid records out of ${processedData.length}`);
      setUploadProgress(60);

      // Upload to Firebase
      console.log('☁️ Uploading to Firebase...');
      const result = await uploadToFirebase(validData, selectedType);
      setUploadProgress(100);

      setUploadStatus('success');
      setSuccessMessage(
        `Successfully uploaded ${result.success} ${selectedType} records to Firebase. ` +
        (result.errors.length > 0 ? `${result.errors.length} records failed.` : '')
      );

      // Notify parent component to refresh data
      onDataProcessed();

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('❌ Upload error:', error);
      setUploadStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to process file');
    } finally {
      setIsUploading(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const readExcelFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsBinaryString(file);
    });
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const processExcelData = (data: any[], type: string) => {
    switch (type) {
      case 'students':
        if (data.length === 0) {
          console.error('❌ No data rows found in Excel');
          return [];
        }

        // Log all column names to debug
        const firstRow = data[0];
        const columnNames = Object.keys(firstRow);
        console.log('🔍 Found column names in Excel:', columnNames);
        console.log('🔍 Column names with lengths:', columnNames.map(name => `"${name}" (length: ${name.length})`));

        // Create a normalized key mapping
        const normalizeKey = (key: string) => key.trim().toLowerCase().replace(/\s+/g, '');
        const keyMap: any = {};
        columnNames.forEach(col => {
          const normalized = normalizeKey(col);
          keyMap[normalized] = col;
          console.log(`🔑 Mapping: "${col}" -> normalized: "${normalized}"`);
        });

        return data
          .map((row, index) => {
            console.log(`\n📝 Processing row ${index + 1}:`, row);

            // Find the actual column names using normalized matching
            const findValue = (possibleNames: string[]) => {
              for (const name of possibleNames) {
                const normalized = normalizeKey(name);
                const actualKey = keyMap[normalized];
                if (actualKey && row[actualKey]) {
                  const value = row[actualKey]?.toString()?.trim();
                  console.log(`✓ Found "${name}" as "${actualKey}" = "${value}"`);
                  return value;
                }
              }
              console.log(`✗ Not found: ${possibleNames.join(', ')}`);
              return '';
            };

            const name = findValue(['Name', 'name', 'NAME', 'Student Name']);
            const rollNo = findValue(['Roll No', 'RollNo', 'Roll Number', 'ROLL NO', 'roll no', 'roll_no']);
            const email = findValue(['Email', 'email', 'EMAIL', 'E-mail', 'Email-id']);
            const program = findValue(['Program', 'program', 'PROGRAM', 'Programme']);
            const mobile = findValue(['Mobile', 'mobile', 'MOBILE', 'Phone', 'Contact']);

            console.log(`📊 Extracted data for row ${index + 1}:`, { name, rollNo, email, program, mobile });

            // Skip if name, rollNo or email is missing
            if (!name || !rollNo || !email) {
              console.log(`⚠️ SKIPPING row ${index + 1} - missing required fields:`, {
                hasName: !!name,
                hasRollNo: !!rollNo,
                hasEmail: !!email
              });
              return null;
            }

            // Use Program as specialization (CSE, CBD, IST, etc.)
            const specialization = program || 'Computer Science';

            const studentData: StudentData = {
              name: name,
              email: email,
              rollNo: rollNo,
              specialization: specialization,
              isVerified: true,
              role: 'student' as const,
              createdAt: new Date(),
            };

            console.log(`✅ Successfully mapped student from row ${index + 1}:`, studentData);

            return studentData;
          })
          .filter((student): student is StudentData => {
            const isValid = student !== null &&
              student.name.trim() !== '' &&
              student.email.trim() !== '' &&
              student.rollNo.trim() !== '';
            if (!isValid && student) {
              console.log('⚠️ Filtered out invalid student:', student);
            }
            return isValid;
          });

      case 'faculty':
        return data
          .map((row) => {
            // Extract all fields from Excel
            const title = row['Title']?.trim() || row['title']?.trim() || '';
            const facultyName = row['Faculty Name']?.trim() || row['Name']?.trim() || row['name']?.trim() || '';
            const email = row['Email-id']?.trim() || row['Email']?.trim() || row['email']?.trim() || '';
            const school = row['School']?.trim() || row['school']?.trim() || 'General';
            const designation = row['Designation']?.trim() || row['designation']?.trim() || '';
            const employeeId = row['Employee ID']?.trim() || row['employeeId']?.trim() || '';
            const contactNumber = row['Contact number']?.toString()?.trim() || row['contactNumber']?.toString()?.trim() || '';

            // Determine maxTeams based on designation
            let maxTeams = 3;
            const designationLower = designation.toLowerCase();
            if (designationLower.includes('professor') || designationLower.includes('hod')) {
              maxTeams = 5;
            } else if (designationLower.includes('assistant')) {
              maxTeams = 3;
            } else if (designationLower.includes('associate')) {
              maxTeams = 4;
            }

            const facultyData: FacultyData = {
              name: facultyName,
              email: email,
              specialization: school,
              maxTeams: maxTeams,
              isVerified: true,
              role: 'faculty' as const,
              createdAt: new Date(),
              title: title,
              designation: designation,
              contactNumber: contactNumber,
              employeeId: employeeId,
              school: school,
            };

            console.log('Mapped faculty:', {
              original: { title, facultyName, email, school, designation, contactNumber, employeeId },
              mapped: facultyData
            });

            return facultyData;
          })
          .filter((faculty) => {
            return faculty.name && faculty.name.trim() !== '' &&
              faculty.email && faculty.email.trim() !== '';
          });

      case 'projects':
        return data.map((row) => {
          const projectData: ProjectData = {
            title: row['Title']?.trim() || row['title']?.trim() || row['Project Title']?.trim() || '',
            description: row['Description']?.trim() || row['description']?.trim() || row['Project Description']?.trim() || '',
            specialization: row['Specialization']?.trim() || row['specialization']?.trim() || row['Department']?.trim() || row['School']?.trim() || 'Computer Science',
            isAssigned: false,
            createdAt: new Date(),
          };
          return projectData;
        });

      default:
        return data;
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const uploadToFirebase = async (data: any[], type: string): Promise<{ success: number; errors: string[] }> => {
    switch (type) {
      case 'students': {
        const studentResult = await bulkUploadStudents(data as StudentData[]);
        if (studentResult.errors.length > 0) {
          console.warn('⚠️ Some students failed to upload:', studentResult.errors);
        }
        return studentResult;
      }
      case 'faculty': {
        const facultyResult = await bulkUploadFaculty(data as FacultyData[]);
        if (facultyResult.errors.length > 0) {
          console.warn('⚠️ Some faculty failed to upload:', facultyResult.errors);
        }
        return facultyResult;
      }
      case 'projects': {
        const projectResult = await bulkUploadProjects(data as ProjectData[]);
        if (projectResult.errors.length > 0) {
          console.warn('⚠️ Some projects failed to upload:', projectResult.errors);
        }
        return projectResult;
      }
      default:
        throw new Error('Invalid data type');
    }
  };

  const getExpectedColumns = (type: string) => {
    switch (type) {
      case 'students':
        return 'Name, Roll No, Email, Program, Mobile';
      case 'faculty':
        return 'Title, Faculty Name, Email-id, School, Designation, Employee ID, Contact number';
      case 'projects':
        return 'Title (or Project Title), Description, Specialization/School';
      default:
        return '';
    }
  };

  const getColumnDetails = (type: string) => {
    switch (type) {
      case 'students':
        return (
          <ul className="text-xs text-blue-700 mt-2 space-y-1">
            <li>• <strong>Name</strong> - Student full name (required)</li>
            <li>• <strong>Roll No</strong> - Student roll number/ID (required)</li>
            <li>• <strong>Email</strong> - Email address (required)</li>
            <li>• <strong>Program</strong> - CSE, CBD, IST, etc. (stored as specialization)</li>
            <li>• <strong>Mobile</strong> - Phone number (optional)</li>
            <li className="text-red-600 font-semibold mt-2">⚠️ Columns like S. No, Team No, Project Title, Problem Statement will be ignored</li>
          </ul>
        );
      case 'faculty':
        return (
          <ul className="text-xs text-blue-700 mt-2 space-y-1">
            <li>• <strong>Title</strong> - Dr., Mr., Ms., etc.</li>
            <li>• <strong>Faculty Name</strong> - Full name (required)</li>
            <li>• <strong>Email-id</strong> - Email address (required)</li>
            <li>• <strong>School</strong> - Department (PSCS, etc.) - stored as specialization</li>
            <li>• <strong>Designation</strong> - Job title (Professor/HoD=5 teams, Associate=4, Assistant=3)</li>
            <li>• <strong>Employee ID</strong> - Faculty ID number</li>
            <li>• <strong>Contact number</strong> - Phone number</li>
          </ul>
        );
      case 'projects':
        return (
          <ul className="text-xs text-blue-700 mt-2 space-y-1">
            <li>• <strong>Title</strong> or <strong>Project Title</strong> - Project name (required)</li>
            <li>• <strong>Description</strong> - Project details</li>
            <li>• <strong>Specialization</strong> or <strong>School</strong> - Department or field</li>
          </ul>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Excel Data Upload
        </CardTitle>
        <CardDescription>
          Upload Excel files to bulk import students, faculty, or project data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Data Type Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Data Type:</label>
          <div className="flex flex-wrap gap-2">
            {(['students', 'faculty', 'projects'] as const).map((type) => (
              <Button
                key={type}
                variant={selectedType === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedType(type)}
                disabled={isUploading}
                className="flex-1 sm:flex-none"
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* Expected Columns Info */}
        <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
          <p className="text-sm font-medium text-blue-800 mb-1">
            📋 Expected Excel columns for {selectedType}:
          </p>
          <p className="text-sm text-blue-600 font-mono">
            {getExpectedColumns(selectedType)}
          </p>
          {getColumnDetails(selectedType)}
          {selectedType === 'students' && (
            <div className="mt-3 space-y-1">
              <p className="text-xs text-green-700 font-semibold">
                ✅ Note: Students uploaded via Excel are automatically verified and can log in immediately.
              </p>
              <p className="text-xs text-purple-700 font-semibold">
                📚 Program field (CSE, CBD, IST) will be stored as their specialization.
              </p>
            </div>
          )}
          {selectedType === 'faculty' && (
            <p className="text-xs text-green-700 mt-3 font-semibold">
              ✅ Note: Faculty are automatically verified. Title, Designation, Contact, and Employee ID are stored in Firestore.
            </p>
          )}
        </div>

        {/* File Upload */}
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
            disabled={isUploading}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full"
            size="lg"
          >
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? 'Processing...' : `Upload ${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} Excel File`}
          </Button>
        </div>

        {/* Progress Bar */}
        {isUploading && (
          <div className="space-y-2">
            <Progress value={uploadProgress} className="w-full" />
            <p className="text-sm text-center text-muted-foreground">
              Processing file... {uploadProgress}%
            </p>
          </div>
        )}

        {/* Status Messages */}
        {uploadStatus === 'success' && (
          <Alert className="border-green-500 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {successMessage}
            </AlertDescription>
          </Alert>
        )}

        {uploadStatus === 'error' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};