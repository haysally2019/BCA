import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing required environment variables');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'present' : 'missing');
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'present' : 'missing');
  process.exit(1);
}

console.log('Using Supabase URL:', supabaseUrl);
console.log('Note: This script will create leads directly via database insert.\n');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const firstNames = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
  'William', 'Barbara', 'David', 'Elizabeth', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa',
  'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley',
  'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle',
  'Kenneth', 'Carol', 'Kevin', 'Amanda', 'Brian', 'Dorothy', 'George', 'Melissa',
  'Timothy', 'Deborah', 'Ronald', 'Stephanie', 'Edward', 'Rebecca', 'Jason', 'Sharon',
  'Jeffrey', 'Laura', 'Ryan', 'Cynthia', 'Jacob', 'Kathleen', 'Gary', 'Amy',
  'Nicholas', 'Angela', 'Eric', 'Shirley', 'Jonathan', 'Anna', 'Stephen', 'Brenda',
  'Larry', 'Pamela', 'Justin', 'Emma', 'Scott', 'Nicole', 'Brandon', 'Helen',
  'Benjamin', 'Samantha', 'Samuel', 'Katherine', 'Raymond', 'Christine', 'Frank', 'Debra',
  'Gregory', 'Rachel', 'Alexander', 'Carolyn', 'Patrick', 'Janet', 'Jack', 'Catherine',
  'Dennis', 'Maria', 'Jerry', 'Heather', 'Tyler', 'Diane', 'Aaron', 'Ruth',
  'Jose', 'Julie', 'Adam', 'Olivia', 'Nathan', 'Joyce', 'Henry', 'Virginia',
  'Douglas', 'Victoria', 'Zachary', 'Kelly', 'Peter', 'Lauren', 'Kyle', 'Christina',
  'Noah', 'Joan', 'Ethan', 'Evelyn', 'Jeremy', 'Judith', 'Walter', 'Megan',
  'Christian', 'Andrea', 'Keith', 'Cheryl', 'Roger', 'Hannah', 'Terry', 'Jacqueline',
  'Austin', 'Martha', 'Sean', 'Gloria', 'Gerald', 'Teresa', 'Carl', 'Ann',
  'Harold', 'Sara', 'Dylan', 'Madison', 'Arthur', 'Frances', 'Lawrence', 'Kathryn',
  'Jordan', 'Janice', 'Jesse', 'Jean', 'Bryan', 'Abigail', 'Billy', 'Alice'
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
  'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White',
  'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young',
  'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
  'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker',
  'Cruz', 'Edwards', 'Collins', 'Reyes', 'Stewart', 'Morris', 'Morales', 'Murphy',
  'Cook', 'Rogers', 'Gutierrez', 'Ortiz', 'Morgan', 'Cooper', 'Peterson', 'Bailey',
  'Reed', 'Kelly', 'Howard', 'Ramos', 'Kim', 'Cox', 'Ward', 'Richardson',
  'Watson', 'Brooks', 'Chavez', 'Wood', 'James', 'Bennett', 'Gray', 'Mendoza',
  'Ruiz', 'Hughes', 'Price', 'Alvarez', 'Castillo', 'Sanders', 'Patel', 'Myers',
  'Long', 'Ross', 'Foster', 'Jimenez', 'Powell', 'Jenkins', 'Perry', 'Russell'
];

const streets = [
  'Main St', 'Oak Ave', 'Maple Dr', 'Cedar Ln', 'Pine Rd', 'Elm St', 'Washington Ave',
  'Lake View Dr', 'Park Pl', 'Hill St', 'Church St', 'Broadway', 'Market St', 'Spring St',
  'Forest Ave', 'River Rd', 'Sunset Blvd', 'Highland Ave', 'Garden St', 'Valley Rd',
  'Willow Way', 'Cherry Ln', 'Birch St', 'Meadow Dr', 'Ridge Rd', 'Summit Ave',
  'Franklin St', 'Lincoln Ave', 'Jefferson Dr', 'Adams St', 'Madison Ave', 'Monroe St',
  'Jackson Blvd', 'Harrison St', 'Grant Ave', 'Sherman Dr', 'Warren Rd', 'Russell St',
  'Colonial Dr', 'Hillside Ave', 'Lakeside Rd', 'Riverside Dr', 'Woodland Ave', 'Parkway Dr'
];

const cities = [
  { name: 'Springfield', state: 'IL', zip: '62701' },
  { name: 'Franklin', state: 'TN', zip: '37064' },
  { name: 'Madison', state: 'WI', zip: '53703' },
  { name: 'Georgetown', state: 'TX', zip: '78626' },
  { name: 'Arlington', state: 'VA', zip: '22201' },
  { name: 'Lexington', state: 'KY', zip: '40502' },
  { name: 'Columbus', state: 'OH', zip: '43201' },
  { name: 'Charlotte', state: 'NC', zip: '28201' },
  { name: 'Indianapolis', state: 'IN', zip: '46201' },
  { name: 'Austin', state: 'TX', zip: '78701' },
  { name: 'Nashville', state: 'TN', zip: '37201' },
  { name: 'Denver', state: 'CO', zip: '80201' },
  { name: 'Portland', state: 'OR', zip: '97201' },
  { name: 'Phoenix', state: 'AZ', zip: '85001' },
  { name: 'Atlanta', state: 'GA', zip: '30301' },
  { name: 'Dallas', state: 'TX', zip: '75201' },
  { name: 'Houston', state: 'TX', zip: '77001' },
  { name: 'Seattle', state: 'WA', zip: '98101' },
  { name: 'Tampa', state: 'FL', zip: '33601' },
  { name: 'Orlando', state: 'FL', zip: '32801' }
];

const roofTypes = [
  'Asphalt Shingles',
  'Metal Roofing',
  'Tile',
  'Slate',
  'Wood Shingles',
  'Flat Roof'
];

const sources = [
  'website',
  'facebook',
  'referral',
  'cold_call',
  'google_ads'
];

const statuses = ['new', 'contacted', 'qualified'];

const notesTemplates = [
  'Interested in roof replacement due to storm damage',
  'Looking for repair estimates on existing roof',
  'Planning home renovation, needs new roof installation',
  'Roof leak reported, needs immediate inspection',
  'Interested in energy-efficient roofing options',
  'Requesting quote for commercial property',
  'Previous customer referral',
  'Needs emergency roof repair',
  'Planning for next season roof replacement',
  'Comparing multiple roofing contractors',
  'Insurance claim for roof damage',
  'HOA requirement for roof upgrade',
  'Interested in metal roofing installation',
  'Seeking warranty information',
  'Scheduled for inspection next week',
  'High priority lead - ready to proceed',
  'Budget conscious, needs financing options',
  'Premium customer, quality focused',
  'Multi-property owner',
  'New construction project'
];

function generatePhoneNumber(index: number): string {
  const areaCode = 200 + (index % 800);
  const prefix = 200 + ((index * 7) % 800);
  const line = 1000 + ((index * 13) % 9000);
  return `(${areaCode}) ${prefix}-${line.toString().padStart(4, '0')}`;
}

function generateEmail(firstName: string, lastName: string, index: number): string {
  const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'email.com'];
  const domain = domains[index % domains.length];
  const separator = index % 3 === 0 ? '.' : index % 3 === 1 ? '_' : '';
  return `${firstName.toLowerCase()}${separator}${lastName.toLowerCase()}${index > 500 ? (index % 100) : ''}@${domain}`;
}

function generateAddress(index: number): string {
  const streetNum = 100 + (index % 9900);
  const street = streets[index % streets.length];
  const city = cities[index % cities.length];
  return `${streetNum} ${street}, ${city.name}, ${city.state} ${city.zip}`;
}

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

async function distributeLeads() {
  try {
    console.log('Starting lead distribution process...\n');

    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, company_name')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (usersError) {
      throw usersError;
    }

    if (!users || users.length === 0) {
      console.error('No active users found');
      return;
    }

    console.log(`Found ${users.length} active users\n`);

    const totalLeadsNeeded = users.length * 100;
    console.log(`Generating ${totalLeadsNeeded} unique leads (100 per user)...\n`);

    const allLeads: any[] = [];
    let leadIndex = 0;

    for (let i = 0; i < totalLeadsNeeded; i++) {
      const firstName = firstNames[leadIndex % firstNames.length];
      const lastName = lastNames[Math.floor(leadIndex / firstNames.length) % lastNames.length];
      const fullName = `${firstName} ${lastName}`;

      const phone = generatePhoneNumber(leadIndex);
      const email = generateEmail(firstName, lastName, leadIndex);
      const address = generateAddress(leadIndex);
      const roofType = roofTypes[leadIndex % roofTypes.length];
      const source = sources[leadIndex % sources.length];
      const status = statuses[leadIndex % statuses.length];
      const score = 60 + (leadIndex % 40);
      const estimatedValue = 5000 + ((leadIndex % 50) * 500);
      const notes = notesTemplates[leadIndex % notesTemplates.length];

      allLeads.push({
        name: fullName,
        phone,
        email,
        address,
        roof_type: roofType,
        source,
        status,
        score,
        estimated_value: estimatedValue,
        notes
      });

      leadIndex++;
    }

    console.log('Shuffling leads for random distribution...\n');
    const shuffledLeads = shuffleArray(allLeads);

    console.log('Distributing leads to users...\n');

    let successCount = 0;
    let errorCount = 0;

    for (let userIndex = 0; userIndex < users.length; userIndex++) {
      const user = users[userIndex];
      const userLeads = shuffledLeads.slice(userIndex * 100, (userIndex + 1) * 100);

      console.log(`Processing user ${userIndex + 1}/${users.length}: ${user.company_name}...`);

      const leadsToInsert = userLeads.map(lead => ({
        company_id: user.id,
        assigned_rep_id: user.id,
        ...lead
      }));

      const chunkSize = 50;
      for (let i = 0; i < leadsToInsert.length; i += chunkSize) {
        const chunk = leadsToInsert.slice(i, i + chunkSize);

        const { data, error } = await supabase
          .from('leads')
          .insert(chunk)
          .select();

        if (error) {
          console.error(`  Error inserting leads chunk for ${user.company_name}:`, error.message);
          errorCount += chunk.length;
        } else {
          successCount += chunk.length;
          console.log(`  ✓ Inserted ${chunk.length} leads (${i + chunk.length}/100)`);
        }
      }

      console.log(`  ✓ Completed: ${user.company_name} now has 100 leads\n`);
    }

    console.log('\n========================================');
    console.log('LEAD DISTRIBUTION COMPLETE!');
    console.log('========================================');
    console.log(`Total leads created: ${successCount}`);
    console.log(`Failed inserts: ${errorCount}`);
    console.log(`Users with leads: ${users.length}`);
    console.log(`Leads per user: 100`);
    console.log('========================================\n');

    const { count } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true });

    console.log(`Total leads in database: ${count}\n`);

  } catch (error) {
    console.error('Fatal error during lead distribution:', error);
    process.exit(1);
  }
}

distributeLeads();
