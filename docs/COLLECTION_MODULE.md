# My Plant Collection Module

A modular plant collection management system that can be used standalone or integrated into the Fronda Prima e-commerce platform.

## Features

### Dashboard (`/collection`)
- Overview of all owned plants with counts by status
- Recent observations sidebar
- Quick action buttons: Add Plant, Add Observation, Filters
- Filter by status, location, tags, or search

### Owned Plants Management
For each plant in your collection:
- Multiple photos with gallery view
- Nickname and scientific/common names
- Purchase date tracking
- Status (alive, dormant, sick, removed)
- Location assignment (predefined or custom text)
- Tags for organization
- Next check-in date reminders

### Observations Log
Track the health of your plants over time:
- Date-based entries
- Condition status (healthy, okay, concern, critical)
- Rich text notes
- Photo attachments

### Private Notes
- Personal notes per plant
- Markdown-style formatting support
- Chronological history

### Locations
- User-defined location list
- Assign multiple plants to locations
- Quick location management

### Public Sharing
- Toggle public visibility per plant
- Auto-generated unique slug URLs
- QR code generation for easy sharing
- Public pages show: photo, nickname, care info, recent observations
- Email/address information is never exposed

## Database Schema

### Tables Created
- `plant_locations` - User-defined locations
- `owned_plants` - Main plant records
- `plant_observations` - Observation log entries
- `plant_notes` - Private notes
- `plant_public_slugs` - Public sharing URLs

### Enums
- `plant_status`: alive | dormant | sick | removed
- `observation_condition`: healthy | okay | concern | critical

### Storage
- `collection-photos` bucket for plant and observation photos

## File Structure

```
src/
├── hooks/collection/
│   ├── index.ts                 # Barrel export
│   ├── useOwnedPlants.ts        # Plant CRUD operations
│   ├── useObservations.ts       # Observation CRUD
│   ├── usePlantLocations.ts     # Location management
│   ├── usePlantNotes.ts         # Notes CRUD
│   └── usePublicSharing.ts      # Public URL management
├── components/collection/
│   ├── index.ts                 # Barrel export
│   ├── CollectionPlantCard.tsx  # Plant card component
│   ├── CollectionFilters.tsx    # Filter UI
│   ├── AddPlantDialog.tsx       # Add plant modal
│   └── AddObservationDialog.tsx # Add observation modal
└── pages/collection/
    ├── index.ts                 # Barrel export
    ├── CollectionDashboard.tsx  # Main dashboard
    ├── PlantDetailPage.tsx      # Single plant view
    ├── LocationsPage.tsx        # Location management
    └── PublicPlantPage.tsx      # Public plant view
```

## Routes

| Path | Access | Description |
|------|--------|-------------|
| `/collection` | Protected | Main dashboard |
| `/collection/plant/:id` | Protected | Plant detail page |
| `/collection/locations` | Protected | Location management |
| `/p/:slug` | Public | Public plant page |

## Detaching as Standalone Module

To extract this module for use in another project:

1. **Copy the files:**
   - `src/hooks/collection/`
   - `src/components/collection/`
   - `src/pages/collection/`

2. **Run the database migration** (from `supabase/migrations/`):
   - Find the migration file containing `CREATE TABLE public.owned_plants`
   - Execute it in your target database

3. **Update imports:**
   - Adjust `@/` path aliases to match your project
   - Ensure you have the required UI components (shadcn/ui)

4. **Required dependencies:**
   - `@tanstack/react-query`
   - `@supabase/supabase-js`
   - `date-fns`
   - `lucide-react`
   - shadcn/ui components

5. **Add routes to your App:**
   ```tsx
   import { CollectionDashboard, PlantDetailPage, LocationsPage, PublicPlantPage } from './pages/collection';
   
   <Route path="/collection" element={<CollectionDashboard />} />
   <Route path="/collection/plant/:id" element={<PlantDetailPage />} />
   <Route path="/collection/locations" element={<LocationsPage />} />
   <Route path="/p/:slug" element={<PublicPlantPage />} />
   ```

## Export Functionality

To export data as CSV, use the Supabase dashboard or create an edge function:

```typescript
// Example: Export owned plants
const { data } = await supabase
  .from('owned_plants')
  .select('*')
  .eq('user_id', userId);

// Convert to CSV
const csv = data.map(plant => 
  `"${plant.nickname}","${plant.scientific_name}","${plant.status}","${plant.purchase_date}"`
).join('\n');
```

## Security

- All personal data protected by Row Level Security (RLS)
- Users can only access their own plants, observations, and notes
- Public pages only expose: nickname, photos, location text, observations
- Email and user ID are never exposed on public pages
- Storage bucket policies restrict upload/delete to owner only
