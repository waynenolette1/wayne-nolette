---
title: 'Building a LIVE SPC Dashboard for RF Manufacturing'
description: 'How I designed and implemented a real-time statistical process control dashboard for microwave and RF component manufacturing at BAE Systems. Monitoring production equipment performance and reducing defect rates.'
pubDate: 2024-06-20
tags: ['six-sigma', 'manufacturing', 'data-analytics', 'process-improvement']
draft: false
confidenceLevel: high
---

**TL;DR**: Production equipment at BAE Systems ran without real-time process visibility. Operators couldn't tell when a process was drifting out of control until defective parts were produced. I built a LIVE SPC (Statistical Process Control) dashboard that monitors equipment performance in real-time, displays control charts with calculated control limits, and alerts operators before defects occur. The result: improved operational efficiency and proactive defect prevention.

## The Problem

Microwave and RF component manufacturing at BAE Systems involves precision processes governed by MIL-STD-883 standards. Bond strength on RF components, for example, has strict specification limits. Exceeding those limits means scrapped parts, rework, and potential delays on defense contracts.

Before the SPC dashboard, process monitoring was reactive:

1. Equipment runs a batch
2. Parts go to inspection
3. Inspector finds defects
4. Investigation begins: was it the equipment, the material, the operator?
5. Corrective action takes days

By the time defects were found, dozens of additional parts had been produced on the same drifting process. The cost wasn't just the defective parts. It was the investigation time, the rework, and the schedule impact.

## Statistical Process Control Fundamentals

SPC is a method for monitoring a process using statistical techniques. The core concept: every process has natural variation. As long as variation stays within control limits, the process is "in control" and producing acceptable output.

**Control Chart:** a time-series plot of a quality measurement (e.g., bond pull strength) with three lines:

- **Center Line (CL):** the process mean
- **Upper Control Limit (UCL):** CL + 3σ
- **Lower Control Limit (LCL):** CL - 3σ

Points within the control limits indicate normal variation. Points outside the limits, or patterns like 7 consecutive points trending upward, signal that the process has shifted and intervention is needed.

The key insight: **control limits are not specification limits.** Specification limits are what the customer requires. Control limits are what the process naturally produces. A process can be "in control" (consistent) but not "capable" (meeting specs). SPC monitors both.

## The Dashboard

The LIVE SPC Dashboard I built provided:

- **Real-time control charts:** updated as measurement data was collected from production equipment
- **Automatic control limit calculation:** UCL, CL, and LCL computed from recent production data
- **Out-of-control alerts:** visual and audible alerts when measurements exceeded control limits
- **Western Electric rules:** 8 classic pattern detection rules beyond simple limit violations (trends, runs, stratification)
- **Process capability metrics:** Cp and Cpk calculated in real-time, showing whether the process could meet specification requirements

## Impact

The dashboard shifted defect detection from reactive to proactive. Operators could see a process drifting toward control limits and intervene (adjusting equipment parameters, checking material lots, or pausing production for investigation) before defective parts were produced.

This is the same principle I later applied at ZoomInfo with DataDog monitoring and the CI Analysis Agent: instrument the process, detect drift in real-time, and intervene before customer impact.

## Connection to Current Work

The LIVE SPC Dashboard was my first experience building a real-time operational visibility platform. The architecture pattern (collect measurements, apply statistical analysis, surface actionable alerts) is directly analogous to what IE Hub does for cloud infrastructure:

| Manufacturing SPC      | IE Hub                    |
| ---------------------- | ------------------------- |
| Equipment measurements | Service metrics           |
| Control limits         | Alert thresholds          |
| Out-of-control alerts  | PagerDuty incidents       |
| Cp/Cpk capability      | SLA compliance            |
| Defect rate tracking   | Incident cost tracking    |
| Operator intervention  | On-call engineer response |

The domain changed. The pattern didn't.
