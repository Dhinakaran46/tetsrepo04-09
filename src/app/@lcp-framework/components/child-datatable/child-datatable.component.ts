import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';

import { MasterListChildrenComponent } from '../../pages/master-list-children/master-list-children.component';

@Component({
  standalone: true,
  selector: 'app-child-datatable',
  imports: [MasterListChildrenComponent],
  templateUrl: './child-datatable.component.html',
  styleUrls: ['./child-datatable.component.scss'],
})
export class ChildDatatableComponent implements OnInit {
  @Input() uuid!: string; // Input for the UUID of the parent item
  @Input() entity_name: any;

  constructor() {}

  ngOnInit() {
    console.log(this.uuid);
    console.log(this.entity_name);
  }
}
