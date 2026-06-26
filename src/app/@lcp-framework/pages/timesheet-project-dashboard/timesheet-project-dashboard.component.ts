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
  styleUrls: ['./timesheet-project-dashboard.component.scss'],
})
export class TimesheetProjectDashboardComponent implements OnInit {
  // Date Filters
  fromDate: string = '2025-04-01';
  toDate: string = '2026-06-22';

  // Loaders for each section (simulates separate parallel API calls)
  loadingSummary: boolean = false;
  loadingStatusChart: boolean = false;
  loadingDeptChart: boolean = false;
  loadingPerfChart: boolean = false;

  // Summary Card Metrics
  summary = {
    totalProjects: 0,
    totalCustomers: 0,
    activeCategories: 0,
    totalCategories: 0,
    healthyProjects: 0,
    needAttentionProjects: 0,
    criticalProjects: 0,
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

  constructor(private gridApiService: GridApiService, private toastr: ToastrService, private cdr: ChangeDetectorRef) {}

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
        { name: 'Approved', data: [] },
      ],
      chart: {
        type: 'bar',
        height: 320,
        stacked: true,
        toolbar: { show: false },
        sparkline: { enabled: false },
      },
      colors: ['#F57E7E', '#74A7E8', '#86C963'],
      xaxis: {
        labels: { show: false },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        show: true,
        max: 30,
        tickAmount: 6,
        labels: {
          style: {
            colors: '#64748b',
            fontSize: '11px',
            fontFamily: 'Nunito, sans-serif',
          },
        },
      },
      grid: { show: false },
    };

    // Actual Scrollable Bars Chart Options
    this.statusChartOptions = {
      series: [],
      chart: {
        type: 'bar',
        height: 320,
        stacked: true,
        toolbar: { show: false },
        zoom: { enabled: false },
      },
      colors: ['#F57E7E', '#74A7E8', '#86C963'],
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '55%',
          borderRadius: 2,
        },
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
            colors: '#334155',
          },
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        show: false,
        max: 30,
        tickAmount: 6,
      },
      grid: {
        borderColor: '#f1f5f9',
        xaxis: { lines: { show: false } },
        yaxis: { lines: { show: true } },
        padding: {
          left: 50,
          bottom: 10,
        },
      },
      legend: { show: false },
      tooltip: {
        shared: true,
        intersect: false,
      },
    };

    // Department Distribution Donut Chart Options
    this.deptChartOptions = {
      series: [],
      chart: {
        type: 'donut',
        height: 220,
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
                offsetY: 18,
              },
              value: {
                show: true,
                fontSize: '20px',
                fontFamily: 'Nunito, sans-serif',
                fontWeight: '700',
                color: '#1e293b',
                offsetY: -12,
                formatter: (val: any) => val,
              },
              total: {
                show: true,
                label: 'employees',
                color: '#64748b',
                fontSize: '10px',
                fontWeight: '500',
                formatter: () => '0',
              },
            },
          },
        },
      },
      legend: { show: false },
    };

    // Top Performers Horizontal Stacked Bar Chart Options
    this.perfChartOptions = {
      series: [],
      chart: {
        type: 'bar',
        height: 280,
        stacked: true,
        toolbar: { show: false },
      },
      colors: ['#0f9f90', '#c7c7c7'],
      plotOptions: {
        bar: {
          horizontal: true,
          barHeight: '45%',
          borderRadius: 2,
        },
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories: [],
        labels: {
          style: {
            colors: '#64748b',
            fontSize: '11px',
            fontFamily: 'Nunito, sans-serif',
          },
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: {
          style: {
            colors: '#1e293b',
            fontSize: '11px',
            fontFamily: 'Nunito, sans-serif',
          },
        },
      },
      grid: {
        borderColor: '#f1f5f9',
        xaxis: { lines: { show: true } },
        yaxis: { lines: { show: false } },
      },
      legend: { show: false },
      tooltip: {
        shared: true,
        intersect: false,
      },
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
      return h + m / 60;
    }
    return parseFloat(str) || 0;
  }

  // Trigger parallel data fetches — each function fetches only what it needs
  fetchData() {
    this.loadingSummary = true;
    this.loadingStatusChart = true;
    this.loadingDeptChart = true;
    this.loadingPerfChart = true;

    this.fetchSummaryData();
    this.fetchTimesheetStatusData();
    this.fetchDepartmentData();
    this.fetchTopPerformersData();
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
      search_all: [{ column_name: 'project_categories.status_id', value: 1, operator: '=' }],
    };

    const projPayload = {
      company_id: 1,
      print_query: true,
      primary_table: 'project_details',
      start_index: 0,
      limit_range: 10000,
      select_columns: [['project_details.*'], ['(fn_project_health_indicator(project_details.id)).health_indicator', 'health_indicator']],
      search_all: [
        { column_name: 'project_details.project_status_id', value: 3, operator: '!=' },
        { column_name: 'project_details.project_awarded_date', value: this.fromDate + ' 00:00:00', operator: '>=' },
        { column_name: 'project_details.project_awarded_date', value: this.toDate + ' 23:59:59', operator: '<=' },
      ],
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
            },
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
      },
    });
  }

  processSummaryData(categories: any[], projects: any[]) {
    // Ignore closed projects (project_status_id === 3)
    projects = projects.filter((p) => p.project_status_id !== 3);

    this.summary.totalProjects = projects.length;

    const customerIds = new Set(projects.map((p) => p.customer_organization_id).filter((id) => id != null));
    this.summary.totalCustomers = customerIds.size;

    let healthy = 0;
    let attention = 0;
    let critical = 0;

    projects.forEach((p) => {
      const hi = parseInt(p.health_indicator || '0', 10);
      if (hi === 3) {
        healthy++;
      } else if (hi === 2) {
        attention++;
      } else {
        critical++;
      }
    });

    this.summary.healthyProjects = healthy;
    this.summary.needAttentionProjects = attention;
    this.summary.criticalProjects = critical;

    const catMap = new Map<number, any>();

    // Initialize map from database categories
    categories.forEach((c) => {
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
          { label: 'Waiting signoff', total: 0, fc: 0, tm: 0 },
        ],
      });
    });

    projects.forEach((p) => {
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

    catMap.forEach((cat) => {
      if (projects.length > 0) {
        cat.percentage = Math.round((cat.total / projects.length) * 100) + '%';
      } else {
        cat.percentage = '0%';
      }
    });

    this.categoriesData = Array.from(catMap.values());
    this.summary.totalCategories = this.categoriesData.length;
    this.summary.activeCategories = this.categoriesData.filter((c) => c.total > 0).length;
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

  // 2. Fetch timesheet status data using dynamic list query with LEFT JOINs and GROUP BY (Date Range Filtered)
  fetchTimesheetStatusData() {
    const payload = {
      print_query: true,
      company_id: 1,
      primary_table: 'user_information',
      start_index: 0,
      limit_range: 10000,
      select_columns: [
        ['user_information.user_id', 'user_id'],
        ['user_information.full_name', 'name'],
        [`(SELECT COUNT(*) FROM yearly_week yw1 WHERE yw1.end_date >= '${this.fromDate}' AND yw1.end_date <= '${this.toDate}')`, 'total_timesheets'],
        [
          `(SELECT COUNT(*) FROM yearly_week yw1 WHERE yw1.end_date >= '${this.fromDate}' AND yw1.end_date <= '${this.toDate}') - COUNT(DISTINCT time_sheet.week_id)`,
          'missed_timesheets',
        ],
        ["COUNT(CASE WHEN time_sheet.process_status = 'submitted' THEN 1 END)", 'unsubmitted_timesheets'],
        ["COUNT(CASE WHEN time_sheet.process_status = 'under_approval' THEN 1 END)", 'submitted_timesheets'],
        ["COUNT(CASE WHEN time_sheet.process_status = 'approved' THEN 1 END)", 'approved_timesheets'],
        ["COUNT(CASE WHEN time_sheet.process_status = 'rejected' THEN 1 END)", 'rejected_timesheets'],
      ],
      includes: [
        {
          join_type: 'LEFT',
          table_name: 'time_sheet',
          join_condition: `time_sheet.user_id = user_information.user_id AND time_sheet.status_id = 1 AND time_sheet.start_date >= '${this.fromDate}' AND time_sheet.end_date <= '${this.toDate}'`,
        },
        {
          join_type: 'LEFT',
          table_name: 'yearly_week',
          join_condition: 'yearly_week.id = time_sheet.week_id',
        },
      ],
      search_all: [
        { column_name: 'user_information.company_id', value: 1, operator: '=' },
        { column_name: 'user_information.status_id', value: 3, operator: '!=' },
      ],
      group_by: ['user_information.user_id', 'user_information.full_name'],
      sort_columns: [['user_information.full_name', 'asc']],
    };

    this.gridApiService.getAllList(payload).subscribe({
      next: (response: any) => {
        if (response && response.status && response.code === 200) {
          const records = response.data?.records || [];
          try {
            this.processTimesheetStatusData(records);
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
      },
    });
  }

  processTimesheetStatusData(records: any[]) {
    const employeeNames: string[] = [];
    const missedData: number[] = [];
    const underApprovalData: number[] = [];
    const approvedData: number[] = [];
    let maxBarHeight = 5;

    records.forEach((r) => {
      const name = (r.name || '').trim();
      if (!name) return;

      const missed = parseInt(r.missed_timesheets || '0', 10);
      const unsubmitted = parseInt(r.unsubmitted_timesheets || '0', 10);
      const rejected = parseInt(r.rejected_timesheets || '0', 10);
      const submitted = parseInt(r.submitted_timesheets || '0', 10);
      const approved = parseInt(r.approved_timesheets || '0', 10);

      // Missed total = missed_timesheets + unsubmitted + rejected
      const totalMissed = missed + unsubmitted + rejected;
      const totalSubmitted = submitted;
      const totalApproved = approved;

      const totalSheets = totalMissed + totalSubmitted + totalApproved;
      const barHeight = totalSheets === 0 ? 1 : totalSheets;
      if (barHeight > maxBarHeight) {
        maxBarHeight = barHeight;
      }

      employeeNames.push(name);

      if (totalSheets === 0) {
        missedData.push(1);
        underApprovalData.push(0);
        approvedData.push(0);
      } else {
        missedData.push(totalMissed);
        underApprovalData.push(totalSubmitted);
        approvedData.push(totalApproved);
      }
    });

    // Calculate dynamic max as multiple of 6 to keep clean whole ticks with tickAmount: 6
    let dynamicMax = maxBarHeight;
    if (dynamicMax < 6) {
      dynamicMax = 6;
    } else {
      dynamicMax = Math.ceil(dynamicMax / 6) * 6;
    }

    this.statusChartYAxisOptions.yaxis.max = dynamicMax;
    this.statusChartYAxisOptions.yaxis.tickAmount = 6;
    this.statusChartOptions.yaxis.max = dynamicMax;
    this.statusChartOptions.yaxis.tickAmount = 6;

    this.employeeNames = employeeNames;
    this.statusChartOptions.xaxis.categories = employeeNames;
    this.statusChartOptions.series = [
      { name: 'Missed timesheets', data: missedData },
      { name: 'Under approval', data: underApprovalData },
      { name: 'Approved', data: approvedData },
    ];

    this.statusChartYAxisOptions = { ...this.statusChartYAxisOptions };
    this.statusChartOptions = { ...this.statusChartOptions };
  }

  // 3. Fetch department distribution data using dynamic list API
  fetchDepartmentData() {
    const payload = {
      print_query: true,
      company_id: 1,
      primary_table: 'departments',
      start_index: 0,
      limit_range: 100,
      select_columns: [
        ['departments.id', 'id'],
        ['departments.uuid', 'uuid'],
        ['departments.id', 'gparam_0'],
        ['departments.name', 'department_name'],
        ['count(departments.name)', 'no_of_employees'],
      ],
      group_by: ['departments.id', 'departments.name'],
      includes: [
        {
          join_type: 'INNER',
          table_name: 'user_information',
          join_condition: 'user_information.department_id = departments.id AND user_information.status_id=1',
        },
      ],
      sort_columns: [['departments.name', 'asc']],
    };

    this.gridApiService.getAllList(payload).subscribe({
      next: (response: any) => {
        if (response && response.status && response.code === 200) {
          const records = response.data?.records || [];
          try {
            this.processDepartmentData(records);
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
      },
    });
  }

  processDepartmentData(records: any[]) {
    // Sort records by employee count descending
    const sortedRecords = [...records].sort((a, b) => {
      const countA = parseInt(a.no_of_employees || '0', 10);
      const countB = parseInt(b.no_of_employees || '0', 10);
      return countB - countA;
    });

    const series: number[] = [];
    const labels: string[] = [];
    const legendData: any[] = [];

    // Calculate total employees
    let totalEmployees = 0;
    sortedRecords.forEach((r) => {
      totalEmployees += parseInt(r.no_of_employees || '0', 10);
    });

    const colorsList = ['#9FAEF9', '#FBBF24', '#60A5FA', '#F87171', '#34D399', '#F472B6', '#A78BFA', '#FB7185', '#38BDF8', '#A3E635'];

    sortedRecords.forEach((r, index) => {
      const name = r.department_name;
      const count = parseInt(r.no_of_employees || '0', 10);
      series.push(count);
      labels.push(name);

      const pctVal = totalEmployees > 0 ? Math.round((count / totalEmployees) * 100) + '%' : '0%';
      legendData.push({
        name,
        count,
        pct: pctVal,
        color: colorsList[index % colorsList.length],
      });
    });

    this.deptLegendData = legendData;
    this.deptChartOptions.series = series;
    this.deptChartOptions.labels = labels;
    this.deptChartOptions.colors = legendData.map((l) => l.color);
    this.deptChartOptions.plotOptions.pie.donut.labels.total.formatter = () => String(totalEmployees);

    this.deptChartOptions = { ...this.deptChartOptions };
  }

  // 4. Fetch top performers billing vs non-billing hours
  // Runs an aggregate query on the server side to fetch only the top 10 performers.
  fetchTopPerformersData() {
    const payload = {
      print_query: true,
      company_id: 1,
      primary_table: 'user_details',
      start_index: 0,
      limit_range: 10, // Fetch top 10 only!
      select_columns: [
        ['user_details.user_id', 'user_id'],
        ["CONCAT(user_details.first_name, ' ', COALESCE(user_details.last_name, ''))", 'name'],
        [
          "SUM(COALESCE(CASE WHEN POSITION(':' IN time_logs.hours) > 0 THEN (split_part(time_logs.hours, ':', 1)::numeric + split_part(time_logs.hours, ':', 2)::numeric / 60.0) ELSE NULLIF(time_logs.hours, '')::numeric END, 0))",
          'total_hours',
        ],
        [
          "SUM(COALESCE(CASE WHEN POSITION(':' IN time_logs.non_billing_hours) > 0 THEN (split_part(time_logs.non_billing_hours, ':', 1)::numeric + split_part(time_logs.non_billing_hours, ':', 2)::numeric / 60.0) ELSE NULLIF(time_logs.non_billing_hours, '')::numeric END, 0))",
          'total_non_billing_hours',
        ],
      ],
      includes: [
        {
          join_type: 'INNER',
          table_name: 'time_logs',
          join_condition: `time_logs.user_id = user_details.user_id AND time_logs.status_id = 1 AND time_logs.logged_date >= '${this.fromDate} 00:00:00' AND time_logs.logged_date <= '${this.toDate} 23:59:59'`,
        },
      ],
      search_all: [{ column_name: 'user_details.company_id', value: 1, operator: '=' }],
      group_by: ['user_details.user_id', 'user_details.first_name', 'user_details.last_name'],
      sort_columns: [
        ['total_hours', 'desc'],
        ['total_non_billing_hours', 'asc'],
      ],
    };

    this.gridApiService.getAllList(payload).subscribe({
      next: (response: any) => {
        if (response && response.status && response.code === 200) {
          const records = response.data?.records || [];
          try {
            this.processTopPerformersData(records);
          } catch (e) {
            console.error('Error processing performer data:', e);
            this.toastr.error('Error rendering top performers chart', 'Error');
          }
        } else {
          this.toastr.error(response?.message || 'Failed to fetch performer logs', 'Error');
        }
        this.loadingPerfChart = false;
        this.triggerResize();
      },
      error: (err) => {
        console.error('Error fetching performer logs:', err);
        this.toastr.error('Error loading performer logs', 'Error');
        this.loadingPerfChart = false;
        this.triggerResize();
      },
    });
  }

  processTopPerformersData(records: any[]) {
    const perfCategories: string[] = [];
    const billingSeriesData: number[] = [];
    const nonBillingSeriesData: number[] = [];

    // Keep most billable performers first (at the top/first position of the chart)
    records.forEach((r) => {
      const name = (r.name || '').trim();
      const totalHrs = parseFloat(r.total_hours) || 0;
      const nonBillingHrs = parseFloat(r.total_non_billing_hours) || 0;
      const billingHrs = totalHrs;

      perfCategories.push(name);
      billingSeriesData.push(Math.round(billingHrs));
      nonBillingSeriesData.push(Math.round(nonBillingHrs));
    });

    this.perfChartOptions.xaxis.categories = perfCategories;
    this.perfChartOptions.series = [
      { name: 'Billing hours', data: billingSeriesData },
      { name: 'Non-billing hours', data: nonBillingSeriesData },
    ];

    this.perfChartOptions = { ...this.perfChartOptions };
  }
}
