package com.spaltertech.surrealaudio

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.media.projection.MediaProjectionManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.IBinder
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.getSystemService
import com.spaltertech.surrealaudio.capture.CaptureService
import com.spaltertech.surrealaudio.capture.FileImportPlayer

private val Chassis = Color(0xFF030309)
private val Amber = Color(0xFFFFB638)
private val Bone = Color(0xFFE6E3D8)
private val Dim = Color(0xFF8D90A0)
private val LineColor = Color(0xFF2B3044)

class MainActivity : ComponentActivity() {

    private var captureService: CaptureService? = null
    private var bound = false
    private val filePlayer by lazy { FileImportPlayer(this) }

    private val connection = object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName?, service: IBinder?) {
            captureService = (service as CaptureService.LocalBinder).getService()
            bound = true
        }
        override fun onServiceDisconnected(name: ComponentName?) {
            captureService = null
            bound = false
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val projectionRequest = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            if (result.resultCode == RESULT_OK && result.data != null) {
                val serviceIntent = Intent(this, CaptureService::class.java)
                    .putExtra(CaptureService.EXTRA_RESULT_CODE, result.resultCode)
                    .putExtra(CaptureService.EXTRA_RESULT_DATA, result.data)
                startForegroundService(serviceIntent)
                bindService(serviceIntent, connection, Context.BIND_AUTO_CREATE)
            }
        }

        val filePicker = registerForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
            uri?.let { filePlayer.play(it) {} }
        }

        val notificationPermission = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerForActivityResult(ActivityResultContracts.RequestPermission()) {}
        } else null

        setContent {
            SurrealAudioScreen(
                onStartCapture = {
                    notificationPermission?.launch(android.Manifest.permission.POST_NOTIFICATIONS)
                    val projectionManager = getSystemService<MediaProjectionManager>()!!
                    projectionRequest.launch(projectionManager.createScreenCaptureIntent())
                },
                onStopCapture = {
                    if (bound) {
                        unbindService(connection)
                        bound = false
                    }
                    stopService(Intent(this, CaptureService::class.java))
                },
                onPickFile = { filePicker.launch("audio/*") },
                onStopFile = { filePlayer.stop() },
                onToggleEngaged = { engaged ->
                    captureService?.setEngaged(engaged)
                    filePlayer.setEngaged(engaged)
                },
            )
        }
    }

    override fun onDestroy() {
        if (bound) {
            unbindService(connection)
            bound = false
        }
        super.onDestroy()
    }
}

private enum class Mode { NONE, CAPTURE, FILE }

@Composable
private fun SurrealAudioScreen(
    onStartCapture: () -> Unit,
    onStopCapture: () -> Unit,
    onPickFile: () -> Unit,
    onStopFile: () -> Unit,
    onToggleEngaged: (Boolean) -> Unit,
) {
    var mode by remember { mutableStateOf(Mode.NONE) }
    var engaged by remember { mutableStateOf(true) }

    MaterialTheme(colorScheme = darkColorScheme(background = Chassis, surface = Chassis)) {
        Surface(modifier = Modifier.fillMaxSize(), color = Chassis) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Top,
            ) {
                Spacer(Modifier.height(48.dp))
                Text(
                    "SURREAL AUDIO",
                    color = Amber,
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 2.sp,
                )
                Text(
                    "TIER 1 · THE MASTER TRUST",
                    color = Dim,
                    fontSize = 11.sp,
                    letterSpacing = 3.sp,
                )
                Spacer(Modifier.height(40.dp))

                ModeCard(
                    title = "CAPTURE OTHER APPS",
                    subtitle = "Spotify and anything else playing on this phone",
                    selected = mode == Mode.CAPTURE,
                ) {
                    mode = Mode.CAPTURE
                    onStartCapture()
                }

                Spacer(Modifier.height(16.dp))

                ModeCard(
                    title = "MY MUSIC",
                    subtitle = "Pick a track from your own library",
                    selected = mode == Mode.FILE,
                ) {
                    mode = Mode.FILE
                    onPickFile()
                }

                Spacer(Modifier.height(40.dp))

                if (mode != Mode.NONE) {
                    Button(
                        onClick = {
                            engaged = !engaged
                            onToggleEngaged(engaged)
                        },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (engaged) Amber else LineColor,
                            contentColor = if (engaged) Chassis else Bone,
                        ),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(56.dp),
                    ) {
                        Text(
                            if (engaged) "⚡ IMMERSIVE ENGAGED" else "IMMERSIVE OFF · TAP TO ENGAGE",
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.sp,
                        )
                    }

                    Spacer(Modifier.height(12.dp))

                    OutlinedButton(
                        onClick = {
                            if (mode == Mode.CAPTURE) onStopCapture() else onStopFile()
                            mode = Mode.NONE
                        },
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text("STOP", color = Dim)
                    }

                    if (mode == Mode.CAPTURE) {
                        Spacer(Modifier.height(24.dp))
                        Text(
                            "For the cleanest result, lower the source app's own volume " +
                                "in Settings > Sound > App volume, so only the processed " +
                                "copy plays back.",
                            color = Dim,
                            fontSize = 12.sp,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ModeCard(title: String, subtitle: String, selected: Boolean, onClick: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(if (selected) LineColor else Chassis)
            .border(1.dp, if (selected) Amber else LineColor)
            .clickable(onClick = onClick)
            .padding(20.dp),
    ) {
        Text(title, color = Bone, fontWeight = FontWeight.Bold, fontSize = 16.sp, letterSpacing = 1.sp)
        Spacer(Modifier.height(4.dp))
        Text(subtitle, color = Dim, fontSize = 12.sp)
    }
}
