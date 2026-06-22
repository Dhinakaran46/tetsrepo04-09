import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgApexchartsModule } from 'ng-apexcharts';
import { GridApiService } from '../../service/common/grid.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-timesheet-project-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, NgApexchartsModule],
  templateUrl: './timesheet-project-dashboard.component.html',
  styleUrls: ['./timesheet-project-dashboard.component.scss']
})
export class TimesheetProjectDashboardComponent implements OnInit {
  // Date Filters
  fromDate: string = '2026-06-01';
  toDate: string = '2026-06-22';

  // Loaders for each section (simulates separate parallel API calls)
  loadingSummary: boolean = false;
  loadingStatusChart: boolean = false;
  loadingDeptChart: boolean = false;
  loadingPerfChart: boolean = false;

  // Summary Card Metrics
  summary = {
    totalProjects: 0,
    totalCustomers: 0
  };

  // Category wise project summary cards
  categoriesData: any[] = [];

  // Apex Chart configurations
  statusChartOptions: any;
  statusChartYAxisOptions: any; 
  deptChartOptions: any;
  perfChartOptions: any;

  // List of employees for Timesheet Status Chart
  employeeNames: string[] = [];

  // Department distribution detailed legend data
  deptLegendData: any[] = [];

  constructor(
    private gridApiService: GridApiService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {}

  private triggerResize() {
    this.cdr.detectChanges();
    setTimeout(() => {
      try {
        window.dispatchEvent(new Event('resize'));
      } catch (e) {
        console.error('Error triggering resize event:', e);
      }
    }, 100);
  }

  ngOnInit(): void {
    this.initializeCharts();
    this.fetchData();
  }

  initializeCharts() {
    // Dummy configuration for Y-Axis chart
    this.statusChartYAxisOptions = {
      series: [
        { name: 'Missed timesheets', data: [] },
        { name: 'Under approval', data: [] },
        { name: 'Approved', data: [] }
      ],
      chart: {
        type: 'bar',
        height: 320,
        stacked: true,
        toolbar: { show: false },
        sparkline: { enabled: false }
      },
      colors: ['#F57E7E', '#74A7E8', '#86C963'],
      xaxis: {
        labels: { show: false },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: {
        show: true,
        max: 30,
        tickAmount: 6,
        labels: {
          style: {
            colors: '#64748b',
            fontSize: '11px',
            fontFamily: 'Nunito, sans-serif'
          }
        }
      },
      grid: { show: false }
    };

    // Actual Scrollable Bars Chart Options
    this.statusChartOptions = {
      series: [],
      chart: {
        type: 'bar',
        height: 320,
        stacked: true,
        toolbar: { show: false },
        zoom: { enabled: false }
      },
      colors: ['#F57E7E', '#74A7E8', '#86C963'], 
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '55%',
          borderRadius: 2
        }
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories: [],
        labels: {
          rotate: -45,
          rotateAlways: true,
          style: {
            fontSize: '10px',
            fontFamily: 'Nunito, sans-serif',
            colors: '#334155'
          }
        },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: {
        show: false,
        max: 30,
        tickAmount: 6
      },
      grid: {
        borderColor: '#f1f5f9',
        xaxis: { lines: { show: false } },
        yaxis: { lines: { show: true } },
        padding: {
          bottom: 10
        }
      },
      legend: { show: false },
      tooltip: {
        shared: true,
        intersect: false
      }
    };

    // Department Distribution Donut Chart Options
    this.deptChartOptions = {
      series: [],
      chart: {
        type: 'donut',
        height: 220
      },
      labels: [],
      colors: [],
      stroke: { width: 1.5, colors: ['#ffffff'] },
      dataLabels: { enabled: false },
      plotOptions: {
        pie: {
          donut: {
            size: '72%',
            labels: {
              show: true,
              name: {
                show: true,
                fontSize: '11px',
                fontFamily: 'Nunito, sans-serif',
                color: '#64748b',
                offsetY: 18
              },
              value: {
                show: true,
                fontSize: '20px',
                fontFamily: 'Nunito, sans-serif',
                fontWeight: '700',
                color: '#1e293b',
                offsetY: -12,
                formatter: (val: any) => val
              },
              total: {
                show: true,
                label: 'employees',
                color: '#64748b',
                fontSize: '10px',
                fontWeight: '500',
                formatter: () => '0'
              }
            }
          }
        }
      },
      legend: { show: false }
    };

    // Top Performers Horizontal Stacked Bar Chart Options
    this.perfChartOptions = {
      series: [],
      chart: {
        type: 'bar',
        height: 280,
        stacked: true,
        toolbar: { show: false }
      },
      colors: ['#0f9f90', '#c7c7c7'], 
      plotOptions: {
        bar: {
          horizontal: true,
          barHeight: '45%',
          borderRadius: 2
        }
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories: [],
        labels: {
          style: {
            colors: '#64748b',
            fontSize: '11px',
            fontFamily: 'Nunito, sans-serif'
          }
        },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: {
        labels: {
          style: {
            colors: '#1e293b',
            fontSize: '11px',
            fontFamily: 'Nunito, sans-serif'
          }
        }
      },
      grid: {
        borderColor: '#f1f5f9',
        xaxis: { lines: { show: true } },
        yaxis: { lines: { show: false } }
      },
      legend: { show: false },
      tooltip: {
        shared: true,
        intersect: false
      }
    };
  }

  // Helper to parse HH:MM or decimal text values to numeric decimal hours
  parseTimeToDecimal(val: string | null | undefined): number {
    if (!val) return 0;
    const str = String(val).trim();
    if (str.includes(':')) {
      const parts = str.split(':');
      const h = parseInt(parts[0], 10) || 0;
      const m = parseInt(parts[1], 10) || 0;
      return h + (m / 60);
    }
    return parseFloat(str) || 0;
  }

  // Trigger parallel data fetches
  fetchData() {
    this.loadingSummary = true;
    this.loadingStatusChart = true;
    this.loadingDeptChart = true;
    this.loadingPerfChart = true;

    // Fetch user details first (acting as the employee catalog)
    const userPayload = {
      company_id: 1,
      print_query: true,
      primary_table: 'user_details',
      start_index: 0,
      limit_range: 10000,
      select_columns: [['user_details.*']],
      search_all: [{ column_name: 'user_details.company_id', value: 1, operator: '=' }]
    };

    this.gridApiService.getAllList(userPayload).subscribe({
      next: (userRes: any) => {
        if (userRes && userRes.status && userRes.code === 200) {
          const users = userRes.data?.records || [];
          
          // Fetch remaining data in parallel
          this.fetchSummaryData();
          this.fetchTimesheetStatusData(users);
          this.fetchDepartmentData(users);
          this.fetchTopPerformersData(users);
        } else {
          const errMsg = userRes?.message || 'Failed to fetch user details';
          this.toastr.error(errMsg, 'Error');
          
          this.loadingSummary = false;
          this.loadingStatusChart = false;
          this.loadingDeptChart = false;
          this.loadingPerfChart = false;
          this.triggerResize();
        }
      },
      error: (err) => {
        console.error('Error fetching user details:', err);
        this.toastr.error('Error loading employee catalog', 'Error');
        this.loadingSummary = false;
        this.loadingStatusChart = false;
        this.loadingDeptChart = false;
        this.loadingPerfChart = false;
        this.triggerResize();
      }
    });
  }

  // Apply filters button handler
  applyFilters() {
    this.fetchData();
  }

  // 1. Fetch project categories summary data
  fetchSummaryData() {
    const catPayload = {
      company_id: 1,
      print_query: true,
      primary_table: 'project_categories',
      start_index: 0,
      limit_range: 10000,
      select_columns: [['project_categories.*']],
      search_all: [{ column_name: 'project_categories.status_id', value: 1, operator: '=' }]
    };

    const projPayload = {
      company_id: 1,
      print_query: true,
      primary_table: 'project_details',
      start_index: 0,
      limit_range: 10000,
      select_columns: [['project_details.*']],
      search_all: [
        { column_name: 'project_details.status_id', value: 1, operator: '=' },
        { column_name: 'project_details.project_status_id', value: 3, operator: '!=' },
        { column_name: 'project_details.created_at', value: this.fromDate + ' 00:00:00', operator: '>=' },
        { column_name: 'project_details.created_at', value: this.toDate + ' 23:59:59', operator: '<=' }
      ]
    };

    this.gridApiService.getAllList(catPayload).subscribe({
      next: (catRes: any) => {
        if (catRes && catRes.status && catRes.code === 200) {
          const categories = catRes.data?.records || [];
          
          this.gridApiService.getAllList(projPayload).subscribe({
            next: (projRes: any) => {
              if (projRes && projRes.status && projRes.code === 200) {
                const projects = projRes.data?.records || [];
                try {
                  this.processSummaryData(categories, projects);
                } catch (e) {
                  console.error('Error processing summary data:', e);
                  this.toastr.error('Error rendering project summary', 'Error');
                }
              } else {
                this.toastr.error(projRes?.message || 'Failed to fetch projects', 'Error');
              }
              this.loadingSummary = false;
              this.triggerResize();
            },
            error: (err) => {
              console.error('Error fetching projects:', err);
              this.toastr.error('Error loading projects', 'Error');
              this.loadingSummary = false;
              this.triggerResize();
            }
          });
        } else {
          this.toastr.error(catRes?.message || 'Failed to fetch project categories', 'Error');
          this.loadingSummary = false;
          this.triggerResize();
        }
      },
      error: (err) => {
        console.error('Error fetching categories:', err);
        this.toastr.error('Error loading project categories', 'Error');
        this.loadingSummary = false;
        this.triggerResize();
      }
    });
  }

  processSummaryData(categories: any[], projects: any[]) {
    // Ignore closed projects (project_status_id === 3)
    projects = projects.filter(p => p.project_status_id !== 3);

    this.summary.totalProjects = projects.length;

    const customerIds = new Set(projects.map(p => p.customer_organization_id).filter(id => id != null));
    this.summary.totalCustomers = customerIds.size;

    const catMap = new Map<number, any>();
    
    // Initialize map from database categories
    categories.forEach(c => {
      let cleanName = (c.cat_name || '').trim();
      if (cleanName.startsWith('.')) {
        cleanName = cleanName.substring(1).trim();
      }
      catMap.set(c.id, {
        name: cleanName,
        slug: cleanName.toLowerCase().replace(/\s+/g, '-'),
        percentage: '0%',
        colorClass: this.getCategoryColorClass(cleanName),
        total: 0,
        fc: 0,
        tm: 0,
        items: [
          { label: 'In Progress', total: 0, fc: 0, tm: 0 },
          { label: 'Free Support', total: 0, fc: 0, tm: 0 },
          { label: 'Waiting signoff', total: 0, fc: 0, tm: 0 }
        ]
      });
    });

    projects.forEach(p => {
      let cat = catMap.get(p.project_category_id);
      if (!cat) return; 

      cat.total++;
      if (p.project_type_id === 1) {
        cat.fc++;
      } else if (p.project_type_id === 2) {
        cat.tm++;
      }

      let statusIndex = -1;
      if (p.project_status_id === 1) {
        statusIndex = 0; 
      } else if (p.project_status_id === 5) {
        statusIndex = 1; 
      } else if (p.project_status_id === 4) {
        statusIndex = 2; 
      }

      if (statusIndex !== -1) {
        cat.items[statusIndex].total++;
        if (p.project_type_id === 1) {
          cat.items[statusIndex].fc++;
        } else if (p.project_type_id === 2) {
          cat.items[statusIndex].tm++;
        }
      }
    });

    catMap.forEach(cat => {
      if (projects.length > 0) {
        cat.percentage = Math.round((cat.total / projects.length) * 100) + '%';
      } else {
        cat.percentage = '0%';
      }
    });

    this.categoriesData = Array.from(catMap.values());
  }

  getCategoryColorClass(name: string): string {
    const n = name.toLowerCase();
    if (n.includes('project')) return 'project-blue';
    if (n.includes('amc')) return 'amc-green';
    if (n.includes('outsourced')) return 'outsourced-purple';
    if (n.includes('poc')) return 'poc-pink';
    if (n.includes('product')) return 'product-orange';
    if (n.includes('internal')) return 'internal-green';
    if (n.includes('office') || n.includes('admin')) return 'office-admin';
    return 'project-blue';
  }

  // 2. Fetch timesheet status data
  fetchTimesheetStatusData(users: any[]) {
    const payload = {
      company_id: 1,
      print_query: true,
      primary_table: 'time_sheet',
      start_index: 0,
      limit_range: 10000,
      select_columns: [['time_sheet.*']],
      search_all: [
        { column_name: 'time_sheet.status_id', value: 1, operator: '=' },
        { column_name: 'time_sheet.start_date', value: this.fromDate, operator: '>=' },
        { column_name: 'time_sheet.end_date', value: this.toDate, operator: '<=' }
      ]
    };

    this.gridApiService.getAllList(payload).subscribe({
      next: (response: any) => {
        if (response && response.status && response.code === 200) {
          const sheets = response.data?.records || [];
          try {
            this.processTimesheetStatusData(users, sheets);
          } catch (e) {
            console.error('Error processing timesheet status:', e);
            this.toastr.error('Error rendering timesheet status chart', 'Error');
          }
        } else {
          this.toastr.error(response?.message || 'Failed to fetch timesheets', 'Error');
        }
        this.loadingStatusChart = false;
        this.triggerResize();
      },
      error: (err) => {
        console.error('Error fetching timesheets:', err);
        this.toastr.error('Error loading timesheets', 'Error');
        this.loadingStatusChart = false;
        this.triggerResize();
      }
    });
  }

  processTimesheetStatusData(users: any[], sheets: any[]) {
    const userMap = new Map<number, string>();
    users.forEach(u => {
      userMap.set(u.user_id, `${u.first_name} ${u.last_name || ''}`.trim());
    });

    const employeeMap = new Map<string, { approved: number, underApproval: number, missed: number }>();
    
    // Initialize map with all employees to ensure they all appear in the chart
    users.forEach(u => {
      const name = `${u.first_name} ${u.last_name || ''}`.trim();
      employeeMap.set(name, { approved: 0, underApproval: 0, missed: 0 });
    });

    sheets.forEach(s => {
      const name = userMap.get(s.user_id);
      if (!name) return;

      const status = employeeMap.get(name)!;
      if (s.process_status === 'approved') {
        status.approved++;
      } else if (s.process_status === 'submitted' || s.process_status === 'under_approval') {
        status.underApproval++;
      } else {
        status.missed++;
      }
    });

    const sortedEmployees = Array.from(employeeMap.keys()).sort();
    const missedData: number[] = [];
    const underApprovalData: number[] = [];
    const approvedData: number[] = [];

    sortedEmployees.forEach(emp => {
      const status = employeeMap.get(emp)!;
      const totalSheets = status.approved + status.underApproval + status.missed;
      if (totalSheets === 0) {
        missedData.push(1); 
        underApprovalData.push(0);
        approvedData.push(0);
      } else {
        missedData.push(status.missed);
        underApprovalData.push(status.underApproval);
        approvedData.push(status.approved);
      }
    });

    this.employeeNames = sortedEmployees;
    this.statusChartOptions.xaxis.categories = sortedEmployees;
    this.statusChartOptions.series = [
      { name: 'Missed timesheets', data: missedData },
      { name: 'Under approval', data: underApprovalData },
      { name: 'Approved', data: approvedData }
    ];

    this.statusChartOptions = { ...this.statusChartOptions };
  }

  // 3. Fetch department distribution data
  fetchDepartmentData(users: any[]) {
    const payload = {
      company_id: 1,
      print_query: true,
      primary_table: 'departments',
      start_index: 0,
      limit_range: 10000,
      select_columns: [['departments.*']],
      search_all: [{ column_name: 'departments.status_id', value: 1, operator: '=' }]
    };

    this.gridApiService.getAllList(payload).subscribe({
      next: (response: any) => {
        if (response && response.status && response.code === 200) {
          const depts = response.data?.records || [];
          try {
            this.processDepartmentData(users, depts);
          } catch (e) {
            console.error('Error processing department data:', e);
            this.toastr.error('Error rendering department distribution chart', 'Error');
          }
        } else {
          this.toastr.error(response?.message || 'Failed to fetch departments', 'Error');
        }
        this.loadingDeptChart = false;
        this.triggerResize();
      },
      error: (err) => {
        console.error('Error fetching departments:', err);
        this.toastr.error('Error loading departments', 'Error');
        this.loadingDeptChart = false;
        this.triggerResize();
      }
    });
  }

  processDepartmentData(users: any[], depts: any[]) {
    const deptIdMap = new Map<number, string>();
    depts.forEach(d => {
      deptIdMap.set(d.id, d.name);
    });

    const deptCountMap = new Map<string, number>();
    users.forEach(u => {
      const deptName = deptIdMap.get(u.department_id) || 'Unassigned';
      deptCountMap.set(deptName, (deptCountMap.get(deptName) || 0) + 1);
    });

    const sortedDepts = Array.from(deptCountMap.entries()).sort((a, b) => b[1] - a[1]);
    const series: number[] = [];
    const labels: string[] = [];
    const legendData: any[] = [];
    const totalEmployees = users.length;

    const colorsList = [
      '#9FAEF9', '#FBBF24', '#60A5FA', '#F87171', '#34D399', 
      '#F472B6', '#A78BFA', '#FB7185', '#38BDF8', '#A3E635'
    ];

    sortedDepts.forEach((item, index) => {
      const [name, count] = item;
      series.push(count);
      labels.push(name);
      
      const pctVal = totalEmployees > 0 ? Math.round((count / totalEmployees) * 100) + '%' : '0%';
      legendData.push({
        name,
        count,
        pct: pctVal,
        color: colorsList[index % colorsList.length]
      });
    });

    this.deptLegendData = legendData;
    this.deptChartOptions.series = series;
    this.deptChartOptions.labels = labels;
    this.deptChartOptions.colors = legendData.map(l => l.color);
    this.deptChartOptions.plotOptions.pie.donut.labels.total.formatter = () => String(totalEmployees);

    this.deptChartOptions = { ...this.deptChartOptions };
  }

  // 4. Fetch top performers billing vs non-billing hours
  fetchTopPerformersData(users: any[]) {
    const payload = {
      company_id: 1,
      print_query: true,
      primary_table: 'time_logs',
      start_index: 0,
      limit_range: 10000,
      select_columns: [['time_logs.*']],
      search_all: [
        { column_name: 'time_logs.status_id', value: 1, operator: '=' },
        { column_name: 'time_logs.logged_date', value: this.fromDate + ' 00:00:00', operator: '>=' },
        { column_name: 'time_logs.logged_date', value: this.toDate + ' 23:59:59', operator: '<=' }
      ]
    };

    this.gridApiService.getAllList(payload).subscribe({
      next: (response: any) => {
        if (response && response.status && response.code === 200) {
          const logs = response.data?.records || [];
          try {
            this.processTopPerformersData(users, logs);
          } catch (e) {
            console.error('Error processing performer data:', e);
            this.toastr.error('Error rendering top performers chart', 'Error');
          }
        } else {
          this.toastr.error(response?.message || 'Failed to fetch time logs', 'Error');
        }
        this.loadingPerfChart = false;
        this.triggerResize();
      },
      error: (err) => {
        console.error('Error fetching time logs:', err);
        this.toastr.error('Error loading time logs', 'Error');
        this.loadingPerfChart = false;
        this.triggerResize();
      }
    });
  }

  processTopPerformersData(users: any[], logs: any[]) {
    const userMap = new Map<number, string>();
    users.forEach(u => {
      userMap.set(u.user_id, `${u.first_name} ${u.last_name || ''}`.trim());
    });

    const performersMap = new Map<string, { billing: number, nonBilling: number, total: number }>();

    logs.forEach(l => {
      const name = userMap.get(l.user_id);
      if (!name) return;
      if (!performersMap.has(name)) {
        performersMap.set(name, { billing: 0, nonBilling: 0, total: 0 });
      }

      const perf = performersMap.get(name)!;
      const totalHrs = this.parseTimeToDecimal(l.hours);
      const nonBillingHrs = this.parseTimeToDecimal(l.non_billing_hours);
      const billingHrs = Math.max(0, totalHrs - nonBillingHrs);

      perf.billing += billingHrs;
      perf.nonBilling += nonBillingHrs;
      perf.total += totalHrs;
    });

    const sortedPerformers = Array.from(performersMap.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10);

    const perfCategories: string[] = [];
    const billingSeriesData: number[] = [];
    const nonBillingSeriesData: number[] = [];

    sortedPerformers.reverse().forEach(item => {
      const [name, perf] = item;
      perfCategories.push(name);
      billingSeriesData.push(Math.round(perf.billing));
      nonBillingSeriesData.push(Math.round(perf.nonBilling));
    });

    this.perfChartOptions.xaxis.categories = perfCategories;
    this.perfChartOptions.series = [
      { name: 'Billing hours', data: billingSeriesData },
      { name: 'Non-billing hours', data: nonBillingSeriesData }
    ];

    this.perfChartOptions = { ...this.perfChartOptions };
  }
}
