package com.spaltertech.surrealaudio.dsp

/**
 * The Surreal Audio engine, ported from the Master Trust Engine's browser
 * DSP graph to run as a native, real-time, block-by-block stereo processor.
 *
 * Core technique (bass-safe frequency-split stereo imaging): a crossover
 * splits the signal at [crossoverHz]. Everything below it passes straight
 * through — never widened, so the low end keeps exactly whatever centering
 * the source already had. Only the band above the crossover goes through
 * the M/S width matrix, plus a Haas cross-feed and early reflections for
 * a sense of space. `engaged` crossfades between the untouched dry signal
 * and this processed bus at constant overall level — this only ever
 * changes the spatial image, never the loudness.
 *
 * This mirrors sspengine-static/immersive.html's Web Audio graph almost
 * exactly for the crossover + width + Haas + early-reflections stages.
 * The browser's convolution room reverb is intentionally left out of this
 * first pass — real-time convolution reverb on a phone needs a proper
 * partitioned-FFT convolver to stay efficient, which is a separate piece
 * of work, not a shortcut taken here.
 */
class SurrealDsp(private val sampleRate: Double) {

    var widthAmount: Double = 1.55
    var haasMix: Double = 0.42
    var earlyReflectionsMix: Double = 0.34
    var crossoverHz: Double = 150.0
        set(value) {
            field = value
            rebuildCrossover()
        }
    var haasDelayMs: Double = 18.0

    /** true = fully processed (Immersive engaged), false = fully dry. Crossfades smoothly. */
    var engaged: Boolean = false

    private var dryGain = 1.0
    private var wetGain = 0.0
    // one output-level step per sample at typical block sizes settles a
    // toggle in a few milliseconds — smooth, not a click.
    private val crossfadeStep = 1.0 / (sampleRate * 0.05)

    private var highL = Biquad(sampleRate, Biquad.Type.HIGHPASS, crossoverHz)
    private var highR = Biquad(sampleRate, Biquad.Type.HIGHPASS, crossoverHz)

    private fun rebuildCrossover() {
        highL = Biquad(sampleRate, Biquad.Type.HIGHPASS, crossoverHz)
        highR = Biquad(sampleRate, Biquad.Type.HIGHPASS, crossoverHz)
    }

    private val haasL = DelayLine(sampleRate, 0.1)
    private val haasR = DelayLine(sampleRate, 0.1)

    // time (s), gain, side (0 = L, 1 = R) — same taps as the browser engine
    private data class ErTap(val timeSec: Double, val gain: Double, val side: Int)
    private val erTaps = listOf(
        ErTap(0.011, 0.6, 0),
        ErTap(0.023, 0.42, 1),
        ErTap(0.037, 0.28, 0),
        ErTap(0.051, 0.18, 1),
    )
    private val erLineL = DelayLine(sampleRate, 0.2)
    private val erLineR = DelayLine(sampleRate, 0.2)

    /** Processes one stereo block in place. Arrays must be the same length. */
    fun processBlock(left: FloatArray, right: FloatArray) {
        val haasDelaySamples = (haasDelayMs / 1000.0 * sampleRate).toInt()
        for (i in left.indices) {
            val dryL = left[i].toDouble()
            val dryR = right[i].toDouble()

            val highLv = highL.process(dryL)
            val highRv = highR.process(dryR)

            val mid = (highLv + highRv) * 0.5
            val side = (highLv - highRv) * 0.5 * widthAmount
            val wideL = mid + side
            val wideR = mid - side

            // Everything below the crossover stays exactly as it was in the
            // dry signal — never reconstructed from a lowpass filter, whose
            // phase never sums back to unity with the highpass band anyway.
            // Only the delta the width matrix introduces in the high band is
            // added, and that delta is ~0 at low frequencies by construction.
            val wideSumL = dryL + (wideL - highLv)
            val wideSumR = dryR + (wideR - highRv)

            haasL.write(wideSumL)
            haasR.write(wideSumR)
            // cross-feed: delayed R feeds the L output and vice versa, same as the browser engine
            val haasOutL = haasR.read(haasDelaySamples) * haasMix
            val haasOutR = haasL.read(haasDelaySamples) * haasMix

            erLineL.write(wideSumL)
            erLineR.write(wideSumR)
            var erL = 0.0
            var erR = 0.0
            for (tap in erTaps) {
                val d = (tap.timeSec * sampleRate).toInt()
                val src = if (tap.side == 0) erLineL else erLineR
                val v = src.read(d) * tap.gain * earlyReflectionsMix
                if (tap.side == 0) erL += v else erR += v
            }

            val processedL = wideSumL + haasOutL + erL
            val processedR = wideSumR + haasOutR + erR

            // smooth crossfade toward the target engaged/bypassed state
            val targetWet = if (engaged) 1.0 else 0.0
            val targetDry = 1.0 - targetWet
            if (wetGain < targetWet) wetGain = (wetGain + crossfadeStep).coerceAtMost(targetWet)
            else if (wetGain > targetWet) wetGain = (wetGain - crossfadeStep).coerceAtLeast(targetWet)
            if (dryGain < targetDry) dryGain = (dryGain + crossfadeStep).coerceAtMost(targetDry)
            else if (dryGain > targetDry) dryGain = (dryGain - crossfadeStep).coerceAtLeast(targetDry)

            left[i] = (dryL * dryGain + processedL * wetGain).toFloat()
            right[i] = (dryR * dryGain + processedR * wetGain).toFloat()
        }
    }

    fun reset() {
        highL.reset(); highR.reset()
        haasL.reset(); haasR.reset()
        erLineL.reset(); erLineR.reset()
    }
}
