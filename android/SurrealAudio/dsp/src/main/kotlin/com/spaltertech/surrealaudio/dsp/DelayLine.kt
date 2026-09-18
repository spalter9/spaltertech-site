package com.spaltertech.surrealaudio.dsp

/** A simple circular sample buffer for fixed, sub-second delays (Haas, early reflections). */
class DelayLine(sampleRate: Double, maxDelaySeconds: Double) {
    private val buffer = DoubleArray((sampleRate * maxDelaySeconds).toInt().coerceAtLeast(1))
    private var writePos = 0

    fun write(sample: Double) {
        buffer[writePos] = sample
        writePos = (writePos + 1) % buffer.size
    }

    /** Reads the sample `delaySamples` behind the current write position. */
    fun read(delaySamples: Int): Double {
        val d = delaySamples.coerceIn(0, buffer.size - 1)
        var idx = writePos - 1 - d
        while (idx < 0) idx += buffer.size
        return buffer[idx % buffer.size]
    }

    fun reset() {
        buffer.fill(0.0)
        writePos = 0
    }
}
