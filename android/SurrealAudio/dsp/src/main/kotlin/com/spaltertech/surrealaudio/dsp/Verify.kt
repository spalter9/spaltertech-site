package com.spaltertech.surrealaudio.dsp

import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.sin
import kotlin.math.sqrt
import kotlin.system.exitProcess

/**
 * Runnable verification for the Surreal Audio engine — no test framework
 * dependency on purpose (this module deliberately depends on nothing but
 * kotlin-stdlib), so `gradle run` proves the DSP math with zero external
 * network dependencies beyond what's already cached. Same standard used to
 * verify the browser engine: generate real signals, measure what actually
 * comes out, don't just trust the code reads right.
 */

private const val SR = 44100.0
private var failures = 0

private fun check(name: String, condition: Boolean, detail: String) {
    if (condition) {
        println("PASS  $name  ($detail)")
    } else {
        println("FAIL  $name  ($detail)")
        failures++
    }
}

private fun rms(a: DoubleArray): Double {
    var sum = 0.0
    for (v in a) sum += v * v
    return sqrt(sum / a.size)
}

/** Decorrelated stereo test tone: left leads, right lags by [phaseOffsetRad]. */
private fun decorrelatedTone(freqHz: Double, seconds: Double, phaseOffsetRad: Double): Pair<FloatArray, FloatArray> {
    val n = (SR * seconds).toInt()
    val l = FloatArray(n)
    val r = FloatArray(n)
    for (i in 0 until n) {
        val t = i / SR
        l[i] = (0.3 * sin(2 * PI * freqHz * t)).toFloat()
        r[i] = (0.3 * sin(2 * PI * freqHz * t + phaseOffsetRad)).toFloat()
    }
    return l to r
}

/** Runs a pure-tone decorrelated signal through a fresh DSP instance and
 *  returns the ratio of output side-energy to input side-energy — measured
 *  directly on the DSP's real output, not through a second independent
 *  probe filter (which would double-filter the portion that already went
 *  through the DSP's own internal crossover, and confound the result). */
private fun widthRatioAt(freqHz: Double, width: Double): Double {
    val (l, r) = decorrelatedTone(freqHz, 0.5, PI / 6)
    val sideBefore = DoubleArray(l.size) { (l[it] - r[it]) / 2.0 }

    val dsp = SurrealDsp(SR)
    dsp.engaged = true
    dsp.widthAmount = width
    dsp.haasMix = 0.0
    dsp.earlyReflectionsMix = 0.0
    val settle = FloatArray(4000)
    dsp.processBlock(settle.copyOf(), settle.copyOf())

    val outL = l.copyOf()
    val outR = r.copyOf()
    dsp.processBlock(outL, outR)
    val sideAfter = DoubleArray(outL.size) { (outL[it] - outR[it]) / 2.0 }

    return rms(sideAfter) / rms(sideBefore)
}

private fun verifyCrossoverKeepsBassCentered() {
    val bassRatio = widthRatioAt(60.0, 1.55)
    val trebleRatio = widthRatioAt(2000.0, 1.55)

    check("bass side-energy stays ~unchanged", bassRatio in 0.85..1.15, "ratio=%.3f (target 0.85-1.15)".format(bassRatio))
    check("treble side-energy clearly widened", trebleRatio > 1.3, "ratio=%.3f (target > 1.3)".format(trebleRatio))
}

private fun verifyBypassIsTransparent() {
    val (l, r) = decorrelatedTone(440.0, 0.2, PI / 4)
    val dsp = SurrealDsp(SR)
    dsp.engaged = false
    val outL = l.copyOf()
    val outR = r.copyOf()
    dsp.processBlock(outL, outR)
    var maxDiff = 0f
    for (i in l.indices) {
        maxDiff = maxOf(maxDiff, abs(outL[i] - l[i]), abs(outR[i] - r[i]))
    }
    check("bypassed output matches dry input", maxDiff < 0.01f, "max sample diff=%.5f (target < 0.01)".format(maxDiff))
}

private fun verifyCorrelationMeter() {
    val n = 4096
    val mono = FloatArray(n) { (0.4 * sin(2 * PI * 300.0 * it / SR)).toFloat() }
    val meterMono = CorrelationMeter(smoothing = 1.0)
    val corrMono = meterMono.update(mono, mono)
    check("identical L/R reads near +1", corrMono > 0.99, "corr=%.4f".format(corrMono))

    val (wideL, wideR) = decorrelatedTone(300.0, n / SR, PI / 2)
    val meterWide = CorrelationMeter(smoothing = 1.0)
    val corrWide = meterWide.update(wideL, wideR)
    check("90-degree-offset stereo reads lower than mono", corrWide < corrMono, "wide=%.4f mono=%.4f".format(corrWide, corrMono))
}

fun main() {
    println("Surreal Audio DSP — verification\n")
    verifyCrossoverKeepsBassCentered()
    verifyBypassIsTransparent()
    verifyCorrelationMeter()
    println()
    if (failures == 0) {
        println("ALL CHECKS PASSED")
    } else {
        println("$failures CHECK(S) FAILED")
        exitProcess(1)
    }
}
