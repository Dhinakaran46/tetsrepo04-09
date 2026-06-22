import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgApexchartsModule } from 'ng-apexcharts';

@Component({
  selector: 'app-timesheet-project-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, NgApexchartsModule],
  templateUrl: './timesheet-project-dashboard.component.html',
  styleUrls: ['./timesheet-project-dashboard.component.scss']
})
export class TimesheetProjectDashboardComponent implements OnInit {
  // Filters
  fromDate: string = '2026-06-01';
  toDate: string = '2026-06-22';

  // Loaders for each section to simulate dynamic separate API calls
  loadingSummary: boolean = false;
  loadingStatusChart: boolean = false;
  loadingDeptChart: boolean = false;
  loadingPerfChart: boolean = false;

  // Summary Card Metrics
  summary = {
    totalProjects: 73,
    totalCustomers: 24
  };

  // Category wise project summary cards
  categoriesData = [
    {
      name: 'Project',
      slug: 'project',
      percentage: '45%',
      colorClass: 'project-blue',
      total: 33,
      fc: 28, 
      tm: 5,
      items: [
        { label: 'In Progress', total: 24, fc: 13, tm: 11 },
        { label: 'Free Support', total: 1, fc: 1, tm: 0 },
        { label: 'Waiting signoff', total: 8, fc: 8, tm: 0 }
      ]
    },
    {
      name: 'AMC',
      slug: 'amc',
      percentage: '21%',
      colorClass: 'amc-green',
      total: 15,
      fc: 14,
      tm: 1,
      items: [
        { label: 'In Progress', total: 14, fc: 13, tm: 1 },
        { label: 'Free Support', total: 1, fc: 1, tm: 0 },
        { label: 'Waiting signoff', total: 0, fc: 0, tm: 0 }
      ]
    },
    {
      name: 'Outsourced',
      slug: 'outsourced',
      percentage: '4%',
      colorClass: 'outsourced-purple',
      total: 3,
      fc: 0,
      tm: 3,
      items: [
        { label: 'In Progress', total: 3, fc: 0, tm: 3 },
        { label: 'Free Support', total: 0, fc: 0, tm: 0 },
        { label: 'Waiting signoff', total: 0, fc: 0, tm: 0 }
      ]
    },
    {
      name: 'POC',
      slug: 'poc',
      percentage: '3%',
      colorClass: 'poc-pink',
      total: 2,
      fc: 2,
      tm: 0,
      items: [
        { label: 'In Progress', total: 2, fc: 2, tm: 0 },
        { label: 'Free Support', total: 0, fc: 0, tm: 0 },
        { label: 'Waiting signoff', total: 0, fc: 0, tm: 0 }
      ]
    },
    {
      name: 'Product',
      slug: 'product',
      percentage: '7%',
      colorClass: 'product-orange',
      total: 5,
      fc: 5,
      tm: 0,
      items: [
        { label: 'In Progress', total: 5, fc: 5, tm: 0 },
        { label: 'Free Support', total: 0, fc: 0, tm: 0 },
        { label: 'Waiting signoff', total: 0, fc: 0, tm: 0 }
      ]
    },
    {
      name: 'Internal',
      slug: 'internal',
      percentage: '12%',
      colorClass: 'internal-green',
      total: 9,
      fc: 9,
      tm: 0,
      items: [
        { label: 'In Progress', total: 9, fc: 9, tm: 0 },
        { label: 'Free Support', total: 0, fc: 0, tm: 0 },
        { label: 'Waiting signoff', total: 0, fc: 0, tm: 0 }
      ]
    },
    {
      name: 'Office Admin',
      slug: 'office-admin',
      percentage: '8%',
      colorClass: 'admin-red',
      total: 6,
      fc: 6,
      tm: 0,
      items: [
        { label: 'In Progress', total: 6, fc: 6, tm: 0 },
        { label: 'Free Support', total: 0, fc: 0, tm: 0 },
        { label: 'Waiting signoff', total: 0, fc: 0, tm: 0 }
      ]
    }
  ];

  // Apex Chart configurations
  statusChartOptions: any;
  statusChartYAxisOptions: any; 
  deptChartOptions: any;
  perfChartOptions: any;

  // List of 50 employees for Timesheet Status Chart
  employeeNames = [
    'Anil Kumar P', 'Arputha Selva T', 'Dhinakaran VP', 'Dinesh Karthick', 'Divya P', 
    'Gobi J', 'Golda Gnanasolvi', 'Gowthaman S', 'Gowtham R', 'Harin Vimal B', 
    'Hari Prasad K', 'Ilango M', 'Jenani S', 'Karthik R', 'Kavitha M', 
    'Keerthana P', 'Krishnan V', 'Lakshmi N', 'Manikandan S', 'Meana R', 
    'Mohamed A', 'Muthu K', 'Nandha K', 'Naveen P', 'Nithya S', 
    'Pandi R', 'Pavithra M', 'Ponraj S', 'Pradeep K', 'Priya L', 
    'Rahul S', 'Rajesh K', 'Ramesh V', 'Revathi P', 'Saravanan M', 
    'Sathish K', 'Selvam R', 'Senthil K', 'Shanthi M', 'Siva P', 
    'Subash R', 'Sudha M', 'Suresh V', 'Tamil S', 'Usha R', 
    'Vignesh K', 'Vijay M', 'Vinoth S', 'Yazhini P', 'Yuvan R'
  ];

  // Department distribution detailed legend data
  deptLegendData = [
    { name: 'Development', count: 30, pct: '64%', color: '#9FAEF9' },
    { name: 'Quality Assurance', count: 5, pct: '11%', color: '#FBBF24' },
    { name: 'Marketing', count: 3, pct: '6%', color: '#60A5FA' },
    { name: 'Management', count: 2, pct: '4%', color: '#F87171' },
    { name: 'Sales', count: 2, pct: '4%', color: '#34D399' },
    { name: 'Operations', count: 1, pct: '2%', color: '#F472B6' },
    { name: 'Finance', count: 1, pct: '2%', color: '#A78BFA' },
    { name: 'Human Resources', count: 1, pct: '2%', color: '#FB7185' },
    { name: 'Ext. Consultants', count: 1, pct: '2%', color: '#38BDF8' },
    { name: 'Training', count: 1, pct: '2%', color: '#A3E635' }
  ];

  constructor() {}

  ngOnInit(): void {
    this.initializeCharts();
  }

  initializeCharts() {
    // 1. Timesheet Status Bar Chart Data
    const missedData = [3, 2, 4, 6, 1, 0, 2, 1, 3, 0, 1, 2, 4, 3, 1, 2, 3, 1, 2, 1, 3, 2, 1, 4, 0, 2, 1, 5, 2, 1, 3, 0, 2, 1, 3, 2, 4, 1, 2, 5, 3, 1, 2, 3, 1, 2, 3, 1, 2, 1];
    const underApprovalData = [8, 9, 6, 8, 2, 4, 9, 7, 13, 2, 8, 9, 7, 8, 9, 6, 11, 8, 9, 7, 8, 9, 6, 8, 2, 4, 9, 7, 13, 2, 8, 9, 7, 8, 9, 6, 11, 8, 9, 7, 8, 9, 6, 8, 2, 4, 9, 7, 13, 2];
    const approvedData = [12, 12, 13, 9, 20, 19, 12, 15, 9, 21, 14, 12, 12, 12, 13, 15, 9, 14, 12, 15, 12, 12, 16, 11, 21, 17, 13, 11, 8, 20, 12, 14, 14, 14, 11, 15, 8, 14, 12, 11, 12, 13, 15, 12, 20, 17, 11, 15, 8, 20];

    // Dummy series configuration for Y-Axis chart
    this.statusChartYAxisOptions = {
      series: [
        { name: 'Missed timesheets', data: [] },
        { name: 'Under approval', data: [] },
        { name: 'Approved', data: [] }
      ],
      chart: {
        type: 'bar',
        height: 280,
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
      series: [
        { name: 'Missed timesheets', data: missedData },
        { name: 'Under approval', data: underApprovalData },
        { name: 'Approved', data: approvedData }
      ],
      chart: {
        type: 'bar',
        height: 280,
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
        categories: this.employeeNames,
        labels: {
          rotate: -45,
          rotateAlways: true,
          style: {
            fontSize: '9px',
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
        yaxis: { lines: { show: true } }
      },
      legend: { show: false },
      tooltip: {
        shared: true,
        intersect: false
      }
    };

    // 2. Department Distribution Donut Chart
    this.deptChartOptions = {
      series: [30, 5, 3, 2, 2, 1, 1, 1, 1, 1],
      chart: {
        type: 'donut',
        height: 220
      },
      labels: [
        'Development', 'Quality Assurance', 'Marketing', 'Management', 'Sales',
        'Operations', 'Finance', 'Human Resources', 'Ext. Consultants', 'Training'
      ],
      colors: [
        '#9FAEF9', '#FBBF24', '#60A5FA', '#F87171', '#34D399', 
        '#F472B6', '#A78BFA', '#FB7185', '#38BDF8', '#A3E635'
      ],
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
                formatter: () => '47'
              }
            }
          }
        }
      },
      legend: { show: false }
    };

    // 3. Top Performers Horizontal Stacked Bar Chart
    this.perfChartOptions = {
      series: [
        { name: 'Billing hours', data: [2100, 1600, 1550, 1250, 1150, 800, 1050, 550, 500, 0] },
        { name: 'Non-billing hours', data: [0, 50, 60, 350, 130, 300, 15, 300, 90, 500] }
      ],
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
        categories: [
          'Divya P', 'Golda Gnanasolvi', 'Gowthaman S', 'Arputha Selva T', 'Gobi J',
          'Gowtham R', 'Harin Vimal B', 'Anil Kumar P', 'Dhinakaran VP', 'Dinesh Karthick'
        ],
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

  applyFilters() {
    this.loadingSummary = true;
    this.loadingStatusChart = true;
    this.loadingDeptChart = true;
    this.loadingPerfChart = true;

    // Fast simulation sequence
    setTimeout(() => { this.loadingSummary = false; }, 400);
    setTimeout(() => { this.loadingStatusChart = false; }, 800);
    setTimeout(() => { this.loadingDeptChart = false; }, 600);
    setTimeout(() => { this.loadingPerfChart = false; }, 1000);
  }
}
