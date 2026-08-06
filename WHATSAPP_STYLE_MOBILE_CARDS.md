# WhatsApp-Style Mobile Card Interaction

## Overview
Mobile cards now use a **WhatsApp-like interaction pattern** where clicking a card selects it and shows available actions in a top action bar. Actions are **dynamic per row**, coming from the API response based on user permissions and row state.

---

## 🎯 Key Features

### 1. **Card Selection (Like WhatsApp Messages)**
- Click any card to select it
- Click the same card again to deselect
- Visual feedback: selected card gets blue border + background
- Check icon appears on selected cards

### 2. **Top Action Bar (Like WhatsApp Action Bar)**
- Appears at the top when a card is selected
- Shows available actions for that specific card
- Blue gradient background with white action buttons
- Close button (X) to cancel selection

### 3. **Dynamic Actions from API**
- Actions **come from backend** when loading grid data
- Each row has `available_actions` array based on:
  - User permissions (role-based access control)
  - Row state (locked, archived, status, etc.)
  - Entity configuration
- No static action configuration needed

### 4. **Mobile-First Design**
- Optimized for touch interactions
- Works identically in:
  - Mobile web browsers
  - Capacitor iOS/Android native apps
  - Desktop responsive view

---

## 📡 API Integration

### Grid Data API Response Format

```typescript
// GET /api/entity/{entity_id}/data
{
  "data": [
    {
      "id": 1,
      "name": "Order #1001",
      "status": "active",
      "created_at": "2026-08-05",
      // ... other fields ...
      
      // Dynamic actions determined by backend
      "available_actions": [
        {
          "action_type": "view",
          "icon": "fa-regular fa-eye",
          "label": "View"
        },
        {
          "action_type": "edit",
          "icon": "fa-regular fa-pen-to-square",
          "label": "Edit"
        },
        {
          "action_type": "delete",
          "icon": "fa-regular fa-trash-can",
          "label": "Delete"
        },
        {
          "action_type": "share",
          "icon": "fa-solid fa-share-nodes",
          "label": "Share"
        }
      ]
    },
    {
      "id": 2,
      "name": "Order #1002",
      "status": "locked",
      // ... other fields ...
      
      // Limited actions for locked row
      "available_actions": [
        {
          "action_type": "view",
          "icon": "fa-regular fa-eye",
          "label": "View"
        }
      ]
    }
  ],
  "total": 100,
  "page": 1,
  "per_page": 20
}
```

### Backend Action Filtering Logic

The backend determines which actions to include based on:

```php
// Example backend logic (pseudo-code)
function getAvailableActions($row, $user) {
    $actions = [];
    
    // Permission checks
    if ($user->hasPermission('view_orders')) {
        $actions[] = [
            'action_type' => 'view',
            'icon' => 'fa-regular fa-eye',
            'label' => 'View'
        ];
    }
    
    if ($user->hasPermission('edit_orders') && !$row->is_locked) {
        $actions[] = [
            'action_type' => 'edit',
            'icon' => 'fa-regular fa-pen-to-square',
            'label' => 'Edit'
        ];
    }
    
    if ($user->hasPermission('delete_orders') && $row->status !== 'completed') {
        $actions[] = [
            'action_type' => 'delete',
            'icon' => 'fa-regular fa-trash-can',
            'label' => 'Delete'
        ];
    }
    
    // Always allow share
    $actions[] = [
        'action_type' => 'share',
        'icon' => 'fa-solid fa-share-nodes',
        'label' => 'Share'
    ];
    
    return $actions;
}
```

---

## 🎨 User Experience Flow

### Step 1: View Card List
```
┌────────────────────────────┐
│ Master Entity - Orders     │
├────────────────────────────┤
│ [Search box]               │
│ 1 - 3 of 3 results         │
├────────────────────────────┤
│ ┌────────────────────────┐ │
│ │ Order #1001            │ │
│ │ Created 2h ago         │ │
│ └────────────────────────┘ │
│ ┌────────────────────────┐ │
│ │ Order #1002            │ │
│ │ Created yesterday      │ │
│ └────────────────────────┘ │
└────────────────────────────┘
```

### Step 2: Click Card to Select
```
┌────────────────────────────┐
│ ✕  1 selected  [👁][✏️][🗑️][🔗]│ ← Action Bar
├────────────────────────────┤
│ [Search box]               │
│ 1 - 3 of 3 results         │
├────────────────────────────┤
│ ┌────────────────────────┐ │
│ │ Order #1001         ✓  │ │ ← Selected
│ │ Created 2h ago         │ │
│ └────────────────────────┘ │
│ ┌────────────────────────┐ │
│ │ Order #1002            │ │
│ │ Created yesterday      │ │
│ └────────────────────────┘ │
└────────────────────────────┘
```

### Step 3: Click Action in Top Bar
- **View** → Navigate to detail page
- **Edit** → Navigate to edit page
- **Delete** → Show confirmation dialog
- **Share** → Open native share sheet (Capacitor)

---

## 💻 Implementation Details

### Component State (TypeScript)

```typescript
export class MasterEntityComponent {
  // Selection state
  selectedMobileCardIndex: number | null = null;
  selectedCardActions: any[] = [];
  
  // Handle card click
  onMobileCardClick(rowIndex: number): void {
    const row = this.filteredMobileCardPreviewRows[rowIndex];
    
    if (this.selectedMobileCardIndex === rowIndex) {
      // Deselect if clicking same card
      this.selectedMobileCardIndex = null;
      this.selectedCardActions = [];
    } else {
      // Select card and load actions from API response
      this.selectedMobileCardIndex = rowIndex;
      this.selectedCardActions = row.available_actions || [];
    }
  }
  
  // Handle action bar clicks
  onMobileCardActionBarClick(action: any): void {
    const row = this.filteredMobileCardPreviewRows[this.selectedMobileCardIndex];
    const actionType = action.action_type;
    
    switch (actionType) {
      case 'view':
        this.router.navigate(['/entity', this.entityId, 'view', row.id]);
        break;
      case 'edit':
        this.router.navigate(['/entity', this.entityId, 'edit', row.id]);
        break;
      case 'delete':
        this.confirmDelete(row);
        break;
      case 'share':
        this.shareRow(row);
        break;
    }
    
    // Close selection after action
    this.selectedMobileCardIndex = null;
    this.selectedCardActions = [];
  }
}
```

### Template (HTML)

```html
<!-- Action Bar (WhatsApp-style) -->
@if (selectedMobileCardIndex !== null && selectedCardActions.length > 0) {
<div class="mobile-action-bar">
  <button (click)="selectedMobileCardIndex = null">
    <i class="fa-solid fa-xmark"></i>
  </button>
  <div class="mobile-action-bar-title">1 selected</div>
  <div class="mobile-action-bar-actions">
    @for (action of selectedCardActions; track action.action_type) {
    <button (click)="onMobileCardActionBarClick(action)">
      <i [class]="action.icon"></i>
      <span>{{ action.label }}</span>
    </button>
    }
  </div>
</div>
}

<!-- Card List -->
@for (row of filteredRows; track row.id; let i = $index) {
<div 
  class="mobile-preview-card" 
  [class.selected]="isCardSelected(i)"
  (click)="onMobileCardClick(i)">
  <!-- Card content -->
  <div class="mobile-preview-grid">
    <!-- Field cells (no action buttons inline) -->
  </div>
  @if (isCardSelected(i)) {
  <div class="mobile-card-selection-indicator">
    <i class="fa-solid fa-check"></i>
  </div>
  }
</div>
}
```

### Styles (SCSS)

```scss
// Action Bar
.mobile-action-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%);
  animation: slideDown 0.3s ease;
}

// Selected Card
.mobile-preview-card {
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    box-shadow: 0 6px 16px rgba(16, 30, 66, 0.12);
  }
  
  &.selected {
    border-color: #0d6efd;
    background: #f0f7ff;
    box-shadow: 0 6px 20px rgba(13, 110, 253, 0.2);
  }
}

// Check Icon
.mobile-card-selection-indicator {
  position: absolute;
  top: 8px;
  right: 8px;
  background: #0d6efd;
  color: #fff;
  border-radius: 50%;
  animation: checkPop 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
```

---

## 🚀 Native Mobile Integration (Capacitor)

### Share Action (Native iOS/Android)

```typescript
import { Share } from '@capacitor/share';

async shareRow(row: any) {
  try {
    await Share.share({
      title: row.name,
      text: row.description,
      url: window.location.href,
      dialogTitle: 'Share Order'
    });
  } catch (error) {
    console.error('Share failed:', error);
  }
}
```

### Platform Detection

```typescript
import { Capacitor } from '@capacitor/core';

isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

isMobile(): boolean {
  return Capacitor.getPlatform() === 'ios' || 
         Capacitor.getPlatform() === 'android';
}
```

---

## 🎯 Benefits

### For Users
- **Faster interaction**: One tap to select, one tap to act
- **Familiar pattern**: Same as WhatsApp, Gmail, etc.
- **Clear feedback**: Visual selection state + action bar
- **Less clutter**: No action buttons on every card

### For Developers
- **Simpler markup**: No action column needed in mobile cards
- **Backend control**: Actions determined by server logic
- **Better security**: Permissions enforced server-side
- **Dynamic UI**: Actions adapt to user role + row state

### For Admins
- **Role-based actions**: Different users see different actions
- **Context-aware**: Actions change based on row state
- **Audit-friendly**: All actions logged with user context
- **Flexible**: Add new actions without frontend changes

---

## 📝 Migration from Old Pattern

### Old Pattern (Static Actions in Cards)
```json
{
  "mobile_view": {
    "columns": [
      {
        "type": "action",
        "action": {
          "actions": ["view", "edit", "delete"]
        }
      }
    ]
  }
}
```

### New Pattern (API-Driven Actions)
```json
// No action column needed in mobile_view!
{
  "mobile_view": {
    "columns": [
      { "type": "field", "field_name": "name" },
      { "type": "field", "field_name": "status" }
    ]
  }
}

// Actions come from API response
GET /api/entity/orders/data → {
  data: [{
    id: 1,
    name: "...",
    available_actions: [...]  // ← Backend determines this
  }]
}
```

---

## 🧪 Testing Checklist

- [ ] Card selection toggles correctly
- [ ] Action bar appears/disappears
- [ ] Actions execute correctly (view, edit, delete, etc.)
- [ ] Different rows show different actions
- [ ] Selection clears after action
- [ ] Native share works on iOS/Android
- [ ] Touch interactions smooth on mobile
- [ ] Hover states work on desktop
- [ ] Animations perform well
- [ ] Empty state handles no actions gracefully

---

## 🔮 Future Enhancements

1. **Multi-select**: Select multiple cards, perform bulk actions
2. **Swipe gestures**: Swipe card for quick actions
3. **Context menu**: Long-press for additional options
4. **Action history**: Recently used actions appear first
5. **Keyboard shortcuts**: Desktop power user features

---

## 📚 Related Files

- `master-entity.component.ts` - Component logic
- `master-entity.component.html` - Template with action bar
- `master-entity.component.scss` - WhatsApp-style CSS
- `MOBILE_CARD_ACTION_CONFIGURATION.md` - Original static action docs (deprecated)
