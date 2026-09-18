package com.spaltertech.surrealaudio.dsp

import kotlin.math.max
import kotlin.math.min
import kotlin.math.sqrt

/**
 * L/R phase correlation: +1 = in phase (mono-safe), 0 = fully decorrelated
 * (wide), -1 = out of phase (cancels toward silence in mono). Same
 * normalized cross-correlation formula as the console and the browser
 * Surreal Audio page, so a reading here means the same thing there.
 */
class CorrelationMeter(private val smoothing: Double = 0.2) {
    var value: Double = 1.0
        private set

    fun update(left: FloatArray, right: FloatArray): Double {
        var sumLR = 0.0
        var sumLL = 0.0
        var sumRR = 0.0
        for (i in left.indices) {
            val l = left[i].toDouble()
            val r = right[i].toDouble()
            sumLR += l * r
            sumLL += l * l
            sumRR += r * r
        }
        val denom = sqrt(sumLL * sumRR)
        val raw = if (denom > 1e-9) max(-1.0, min(1.0, sumLR / denom)) else 1.0
        value += (raw - value) * smoothing
        return value
    }
}
