package com.spaltertech.surrealaudio.dsp

import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

/**
 * Second-order IIR filter using the RBJ Audio EQ Cookbook formulas — the
 * same coefficients the Web Audio spec requires BiquadFilterNode to use,
 * so a lowpass/highpass pair here behaves identically to the browser
 * engine's crossover, not just approximately.
 *
 * Stateful: carries x1/x2/y1/y2 across calls so it filters correctly as a
 * continuous stream, not block-by-block from a cold start each time.
 */
class Biquad(sampleRate: Double, type: Type, freq: Double, q: Double = 0.70710678) {
    enum class Type { LOWPASS, HIGHPASS }

    private var b0 = 0.0
    private var b1 = 0.0
    private var b2 = 0.0
    private var a1 = 0.0
    private var a2 = 0.0

    private var x1 = 0.0
    private var x2 = 0.0
    private var y1 = 0.0
    private var y2 = 0.0

    init {
        val w0 = 2.0 * PI * freq / sampleRate
        val cosw0 = cos(w0)
        val alpha = sin(w0) / (2.0 * q)
        val a0: Double
        when (type) {
            Type.LOWPASS -> {
                b0 = (1 - cosw0) / 2
                b1 = 1 - cosw0
                b2 = (1 - cosw0) / 2
                a0 = 1 + alpha
                a1 = -2 * cosw0
                a2 = 1 - alpha
            }
            Type.HIGHPASS -> {
                b0 = (1 + cosw0) / 2
                b1 = -(1 + cosw0)
                b2 = (1 + cosw0) / 2
                a0 = 1 + alpha
                a1 = -2 * cosw0
                a2 = 1 - alpha
            }
        }
        b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0
    }

    fun process(x0: Double): Double {
        val y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
        x2 = x1; x1 = x0
        y2 = y1; y1 = y0
        return y0
    }

    fun reset() {
        x1 = 0.0; x2 = 0.0; y1 = 0.0; y2 = 0.0
    }
}
