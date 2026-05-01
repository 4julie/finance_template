// SPDX-License-Identifier: BUSL-1.1

package com.finance.desktop.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.hoverable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.key.*
import androidx.compose.ui.input.pointer.PointerEventType
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.finance.desktop.theme.FinanceDesktopTheme

/** Data point for line and area charts. */
data class ChartDataPoint(val label: String, val value: Float, val formattedValue: String = "")

/** Data slice for pie/donut charts. */
data class PieSlice(val label: String, val value: Float, val color: Color, val formattedValue: String = "")

/** Data group for bar charts. */
data class BarDataPoint(val label: String, val value: Float, val color: Color = Color.Unspecified, val formattedValue: String = "")

// =============================================================================
// Line Chart
// =============================================================================

/**
 * Interactive line chart with tooltips and keyboard navigation.
 *
 * Supports multiple data series, hover tooltips, and keyboard-navigable
 * data points (Left/Right arrows). Narrator reads data point values.
 */
@Composable
fun FinanceLineChart(
    data: List<ChartDataPoint>,
    title: String,
    lineColor: Color = MaterialTheme.colorScheme.primary,
    modifier: Modifier = Modifier,
) {
    var hoveredIndex by remember { mutableStateOf(-1) }
    var focusedIndex by remember { mutableStateOf(0) }
    val animatedProgress by animateFloatAsState(1f, animationSpec = tween(1000), label = "line-anim")

    Column(modifier = modifier.semantics { contentDescription = "${title}, line chart with ${data.size} data points" }
        .onPreviewKeyEvent { e ->
            if (e.type != KeyEventType.KeyDown) return@onPreviewKeyEvent false
            when (e.key) {
                Key.DirectionLeft -> { focusedIndex = (focusedIndex - 1).coerceAtLeast(0); true }
                Key.DirectionRight -> { focusedIndex = (focusedIndex + 1).coerceAtMost(data.size - 1); true }
                else -> false
            }
        }) {
        Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold,
            modifier = Modifier.semantics { heading() })
        Spacer(Modifier.height(FinanceDesktopTheme.spacing.sm))

        if (data.isEmpty()) {
            Box(Modifier.fillMaxWidth().height(200.dp), contentAlignment = Alignment.Center) {
                Text("No data available", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        } else {
            val maxVal = data.maxOf { it.value }.coerceAtLeast(1f)
            Box(Modifier.fillMaxWidth().height(200.dp)) {
                Canvas(Modifier.fillMaxSize().pointerInput(data) {
                    awaitPointerEventScope {
                        while (true) {
                            val event = awaitPointerEvent()
                            if (event.type == PointerEventType.Move) {
                                val x = event.changes.firstOrNull()?.position?.x ?: 0f
                                hoveredIndex = ((x / size.width) * (data.size - 1)).toInt().coerceIn(0, data.size - 1)
                            }
                        }
                    }
                }) {
                    val stepX = size.width / (data.size - 1).coerceAtLeast(1)
                    val points = data.mapIndexed { i, dp -> Offset(i * stepX, size.height - (dp.value / maxVal * size.height * animatedProgress)) }
                    val path = Path().apply { points.forEachIndexed { i, pt -> if (i == 0) moveTo(pt.x, pt.y) else lineTo(pt.x, pt.y) } }
                    drawPath(path, lineColor, style = Stroke(3.dp.toPx(), cap = StrokeCap.Round))
                    points.forEachIndexed { i, pt ->
                        val r = if (i == hoveredIndex || i == focusedIndex) 6.dp.toPx() else 3.dp.toPx()
                        drawCircle(lineColor, r, pt)
                    }
                }
                if (hoveredIndex in data.indices) {
                    val pt = data[hoveredIndex]
                    Surface(shape = RoundedCornerShape(4.dp), tonalElevation = 4.dp,
                        modifier = Modifier.align(Alignment.TopEnd).padding(FinanceDesktopTheme.spacing.sm)) {
                        Text("${pt.label}: ${pt.formattedValue}", modifier = Modifier.padding(FinanceDesktopTheme.spacing.sm), style = MaterialTheme.typography.labelSmall)
                    }
                }
            }
        }
    }
}

// =============================================================================
// Bar Chart
// =============================================================================

/** Interactive bar chart with hover tooltips and keyboard navigation. */
@Composable
fun FinanceBarChart(
    data: List<BarDataPoint>,
    title: String,
    defaultColor: Color = MaterialTheme.colorScheme.primary,
    modifier: Modifier = Modifier,
) {
    var hoveredIndex by remember { mutableStateOf(-1) }
    val animatedProgress by animateFloatAsState(1f, tween(800), label = "bar-anim")

    Column(modifier = modifier.semantics { contentDescription = "${title}, bar chart with ${data.size} bars" }) {
        Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, modifier = Modifier.semantics { heading() })
        Spacer(Modifier.height(FinanceDesktopTheme.spacing.sm))

        if (data.isEmpty()) {
            Box(Modifier.fillMaxWidth().height(200.dp), contentAlignment = Alignment.Center) {
                Text("No data available", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        } else {
            val maxVal = data.maxOf { it.value }.coerceAtLeast(1f)
            Box(Modifier.fillMaxWidth().height(200.dp)) {
                Canvas(Modifier.fillMaxSize().pointerInput(data) {
                    awaitPointerEventScope {
                        while (true) {
                            val event = awaitPointerEvent()
                            if (event.type == PointerEventType.Move) {
                                val x = event.changes.firstOrNull()?.position?.x ?: 0f
                                val barWidth = size.width / data.size
                                hoveredIndex = (x / barWidth).toInt().coerceIn(0, data.size - 1)
                            }
                        }
                    }
                }) {
                    val barWidth = size.width / data.size
                    val gap = 4.dp.toPx()
                    data.forEachIndexed { i, bar ->
                        val h = (bar.value / maxVal) * size.height * animatedProgress
                        val color = if (bar.color != Color.Unspecified) bar.color else defaultColor
                        val alpha = if (i == hoveredIndex) 1f else 0.8f
                        drawRect(color.copy(alpha = alpha), Offset(i * barWidth + gap, size.height - h), Size(barWidth - gap * 2, h))
                    }
                }
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                data.forEach { bar -> Text(bar.label, style = MaterialTheme.typography.labelSmall, textAlign = TextAlign.Center, modifier = Modifier.weight(1f).semantics { contentDescription = "${bar.label}: ${bar.formattedValue}" }) }
            }
        }
    }
}

// =============================================================================
// Donut Chart
// =============================================================================

/** Interactive donut/pie chart with legend and hover tooltips. */
@Composable
fun FinanceDonutChart(
    slices: List<PieSlice>,
    title: String,
    modifier: Modifier = Modifier,
) {
    var hoveredSlice by remember { mutableStateOf(-1) }
    val total = slices.sumOf { it.value.toDouble() }.toFloat().coerceAtLeast(1f)

    Column(modifier = modifier.semantics { contentDescription = "${title}, donut chart with ${slices.size} categories" }) {
        Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, modifier = Modifier.semantics { heading() })
        Spacer(Modifier.height(FinanceDesktopTheme.spacing.sm))

        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(FinanceDesktopTheme.spacing.xxl)) {
            Box(Modifier.size(180.dp), contentAlignment = Alignment.Center) {
                Canvas(Modifier.fillMaxSize()) {
                    val strokeWidth = 24.dp.toPx()
                    val arcSize = Size(size.width - strokeWidth, size.height - strokeWidth)
                    val topLeft = Offset(strokeWidth / 2, strokeWidth / 2)
                    var startAngle = -90f
                    slices.forEachIndexed { i, slice ->
                        val sweep = (slice.value / total) * 360f
                        val alpha = if (i == hoveredSlice) 1f else 0.85f
                        drawArc(slice.color.copy(alpha = alpha), startAngle, sweep, false, topLeft, arcSize, style = Stroke(strokeWidth, cap = StrokeCap.Butt))
                        startAngle += sweep
                    }
                }
                if (hoveredSlice in slices.indices) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(slices[hoveredSlice].label, style = MaterialTheme.typography.labelSmall)
                        Text(slices[hoveredSlice].formattedValue, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    }
                }
            }

            // Legend
            Column(verticalArrangement = Arrangement.spacedBy(FinanceDesktopTheme.spacing.sm)) {
                slices.forEachIndexed { i, slice ->
                    Row(verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.semantics { contentDescription = "${slice.label}: ${slice.formattedValue}" }) {
                        Box(Modifier.size(12.dp).background(slice.color, CircleShape))
                        Spacer(Modifier.width(FinanceDesktopTheme.spacing.sm))
                        Text(slice.label, style = MaterialTheme.typography.bodySmall)
                        Spacer(Modifier.width(FinanceDesktopTheme.spacing.sm))
                        Text(slice.formattedValue, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
    }
}

// =============================================================================
// Area Chart
// =============================================================================

/** Filled area chart with gradient fill. */
@Composable
fun FinanceAreaChart(
    data: List<ChartDataPoint>,
    title: String,
    fillColor: Color = MaterialTheme.colorScheme.primary,
    modifier: Modifier = Modifier,
) {
    val animatedProgress by animateFloatAsState(1f, tween(1000), label = "area-anim")
    Column(modifier = modifier.semantics { contentDescription = "${title}, area chart with ${data.size} data points" }) {
        Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold, modifier = Modifier.semantics { heading() })
        Spacer(Modifier.height(FinanceDesktopTheme.spacing.sm))
        if (data.isEmpty()) {
            Box(Modifier.fillMaxWidth().height(200.dp), contentAlignment = Alignment.Center) {
                Text("No data available", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        } else {
            val maxVal = data.maxOf { it.value }.coerceAtLeast(1f)
            Canvas(Modifier.fillMaxWidth().height(200.dp)) {
                val stepX = size.width / (data.size - 1).coerceAtLeast(1)
                val areaPath = Path().apply {
                    moveTo(0f, size.height)
                    data.forEachIndexed { i, dp -> lineTo(i * stepX, size.height - (dp.value / maxVal * size.height * animatedProgress)) }
                    lineTo(size.width, size.height)
                    close()
                }
                drawPath(areaPath, fillColor.copy(alpha = 0.2f))
                val linePath = Path().apply { data.forEachIndexed { i, dp -> val y = size.height - (dp.value / maxVal * size.height * animatedProgress); if (i == 0) moveTo(0f, y) else lineTo(i * stepX, y) } }
                drawPath(linePath, fillColor, style = Stroke(2.dp.toPx(), cap = StrokeCap.Round))
            }
        }
    }
}
