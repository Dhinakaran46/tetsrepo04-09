import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

enum ApprovalStatus {
  pending = 0, // Default
  approval_needed = 1, // Approval is required but not yet done
  approval_completed = 2, // Approved
  approval_rejected = 3, // Rejected
  void = 4, // Invalidated or skipped
}

@Component({
  selector: 'app-approval-requests-tracking',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './approval-requests-tracking.component.html',
  styleUrl: './approval-requests-tracking.component.scss',
})
export class ApprovalRequestsTrackingComponent {
  approvalSteps = [
    {
      approver: 'department_head',
      approver_order_no: 1,
      approver_type: 'tag',
      assigned_at: '2025-04-11T18:51:56.825331+05:30',
      processed_at: '2025-04-11T18:51:56.825331+05:30',
      review_status: 'approval_completed',
    },
    {
      approver: '1,2',
      approver_order_no: 2,
      approver_type: 'user_id',
      assigned_at: null,
      processed_at: null,
      review_status: 'approval_rejected',
    },
    {
      approver: '3',
      approver_order_no: 3,
      approver_type: 'role_id',
      assigned_at: null,
      processed_at: null,
      review_status: 'void',
    },
  ];
}
