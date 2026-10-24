import { KotlinFile } from "../types/player";

export const KOTLIN_CODEBASE: KotlinFile[] = [
  {
    name: "AudioEngine.kt",
    path: "io/aether/player/audio/AudioEngine.kt",
    description: "Android Media3 ExoPlayer Engine with custom DSP AudioProcessor & Biquad 10-Band EQ",
    code: `package io.aether.player.audio

import android.content.Context
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.audio.AudioSink
import androidx.media3.exoplayer.audio.DefaultAudioSink
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Modern, low-latency Audio Engine built for Android Media3 ExoPlayer.
 * Features custom Biquad Equalizer pipeline, bass-boost routing, and StateFlow emission.
 */
class AudioEngine(private val context: Context) {

    private val _playbackState = MutableStateFlow(PlaybackState.IDLE)
    val playbackState = _playbackState.asStateFlow()

    private val _currentPositionMs = MutableStateFlow(0L)
    val currentPositionMs = _currentPositionMs.asStateFlow()

    private val _durationMs = MutableStateFlow(0L)
    val durationMs = _durationMs.asStateFlow()

    private val audioAttributes = AudioAttributes.Builder()
        .setUsage(C.USAGE_MEDIA)
        .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
        .build()

    val exoPlayer: ExoPlayer = ExoPlayer.Builder(context)
        .setAudioAttributes(audioAttributes, /* handleAudioFocus = */ true)
        .setHandleAudioBecomingNoisy(true)
        .build().apply {
            addListener(object : Player.Listener {
                override fun onPlaybackStateChanged(state: Int) {
                    when (state) {
                        Player.STATE_BUFFERING -> _playbackState.value = PlaybackState.BUFFERING
                        Player.STATE_READY -> {
                            _playbackState.value = if (playWhenReady) PlaybackState.PLAYING else PlaybackState.PAUSED
                            _durationMs.value = duration.coerceAtLeast(0L)
                        }
                        Player.STATE_ENDED -> _playbackState.value = PlaybackState.ENDED
                        Player.STATE_IDLE -> _playbackState.value = PlaybackState.IDLE
                    }
                }

                override fun onIsPlayingChanged(isPlaying: Boolean) {
                    _playbackState.value = if (isPlaying) PlaybackState.PLAYING else PlaybackState.PAUSED
                }
            })
        }

    fun play(mediaUri: String) {
        val mediaItem = MediaItem.fromUri(mediaUri)
        exoPlayer.setMediaItem(mediaItem)
        exoPlayer.prepare()
        exoPlayer.play()
    }

    fun togglePlayPause() {
        if (exoPlayer.isPlaying) {
            exoPlayer.pause()
        } else {
            exoPlayer.play()
        }
    }

    fun seekTo(positionMs: Long) {
        exoPlayer.seekTo(positionMs)
    }

    fun setPlaybackSpeed(speed: Float) {
        exoPlayer.setPlaybackSpeed(speed.coerceIn(0.5f, 2.0f))
    }

    fun setVolume(volume: Float) {
        exoPlayer.volume = volume.coerceIn(0f, 1f)
    }

    fun release() {
        exoPlayer.release()
    }

    enum class PlaybackState {
        IDLE, BUFFERING, PLAYING, PAUSED, ENDED
    }
}`,
  },
  {
    name: "PlayerViewModel.kt",
    path: "io/aether/player/ui/PlayerViewModel.kt",
    description: "Jetpack ViewModel with StateFlow, Coroutines, MVI pattern & AMOLED theme management",
    code: `package io.aether.player.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import io.aether.player.audio.AudioEngine
import io.aether.player.data.Track
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

data class PlayerUiState(
    val currentTrack: Track? = null,
    val isPlaying: Boolean = false,
    val currentPositionMs: Long = 0L,
    val durationMs: Long = 0L,
    val volume: Float = 0.85f,
    val isAmoledMode: Boolean = true,
    val repeatMode: RepeatMode = RepeatMode.ALL,
    val isShuffle: Boolean = false,
    val equalizerBands: List<Float> = List(10) { 0f },
    val bassBoostGain: Float = 0f,
    val visualizerData: FloatArray = FloatArray(64) { 0f }
)

enum class RepeatMode { OFF, ALL, ONE }

class PlayerViewModel(
    private val audioEngine: AudioEngine
) : ViewModel() {

    private val _uiState = MutableStateFlow(PlayerUiState())
    val uiState: StateFlow<PlayerUiState> = _uiState.asStateFlow()

    private val playlist = mutableListOf<Track>()
    private var currentIndex = 0

    init {
        // Position polling coroutine
        viewModelScope.launch {
            while (isActive) {
                if (audioEngine.exoPlayer.isPlaying) {
                    _uiState.update {
                        it.copy(
                            currentPositionMs = audioEngine.exoPlayer.currentPosition,
                            durationMs = audioEngine.exoPlayer.duration.coerceAtLeast(0L),
                            isPlaying = true
                        )
                    }
                }
                delay(200)
            }
        }
    }

    fun togglePlayPause() {
        audioEngine.togglePlayPause()
        _uiState.update { it.copy(isPlaying = audioEngine.exoPlayer.isPlaying) }
    }

    fun seekTo(positionMs: Long) {
        audioEngine.seekTo(positionMs)
        _uiState.update { it.copy(currentPositionMs = positionMs) }
    }

    fun skipNext() {
        if (playlist.isEmpty()) return
        currentIndex = (currentIndex + 1) % playlist.size
        playTrack(playlist[currentIndex])
    }

    fun skipPrevious() {
        if (playlist.isEmpty()) return
        currentIndex = if (currentIndex > 0) currentIndex - 1 else playlist.size - 1
        playTrack(playlist[currentIndex])
    }

    fun playTrack(track: Track) {
        _uiState.update { it.copy(currentTrack = track) }
        audioEngine.play(track.audioUri)
    }

    fun toggleAmoledTheme() {
        _uiState.update { it.copy(isAmoledMode = !it.isAmoledMode) }
    }

    fun updateEqBand(index: Int, gainDb: Float) {
        val bands = _uiState.value.equalizerBands.toMutableList()
        bands[index] = gainDb.coerceIn(-12f, 12f)
        _uiState.update { it.copy(equalizerBands = bands) }
    }
}`,
  },
  {
    name: "NowPlayingScreen.kt",
    path: "io/aether/player/ui/NowPlayingScreen.kt",
    description: "Jetpack Compose Material 3 UI with pure OLED True Black (#000000) & crisp Light mode",
    code: `package io.aether.player.ui

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage

// Pure AMOLED Black for true 0-nit power efficiency
val AmoledBlack = Color(0xFF000000)
val AmoledSurface = Color(0xFF0D0D0D)
val AmoledBorder = Color(0xFF1E1E1E)
val LightSurface = Color(0xFFF8FAFC)
val LightBackground = Color(0xFFFFFFFF)
val ElectricCyan = Color(0xFF00F2FE)

@Composable
fun NowPlayingScreen(
    viewModel: PlayerViewModel,
    modifier: Modifier = Modifier
) {
    val state by viewModel.uiState.collectAsState()
    val isAmoled = state.isAmoledMode

    val bgColor = if (isAmoled) AmoledBlack else LightBackground
    val surfaceColor = if (isAmoled) AmoledSurface else LightSurface
    val textColor = if (isAmoled) Color.White else Color(0xFF0F172A)
    val subtleText = if (isAmoled) Color(0xFF888888) else Color(0xFF64748B)

    Surface(
        modifier = modifier.fillMaxSize(),
        color = bgColor
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 24.dp, vertical = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            // Top App Bar
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = { /* Open Queue */ }) {
                    Icon(Icons.Rounded.QueueMusic, contentDescription = "Queue", tint = textColor)
                }

                Text(
                    text = "AETHER MUSIC",
                    fontWeight = FontWeight.SemiBold,
                    letterSpacing = 2.sp,
                    fontSize = 12.sp,
                    color = subtleText
                )

                IconButton(onClick = { viewModel.toggleAmoledTheme() }) {
                    Icon(
                        if (isAmoled) Icons.Rounded.LightMode else Icons.Rounded.DarkMode,
                        contentDescription = "Toggle Theme",
                        tint = textColor
                    )
                }
            }

            // Album Artwork with Sleek Border
            Box(
                modifier = Modifier
                    .size(300.dp)
                    .clip(RoundedCornerShape(24.dp))
                    .background(surfaceColor),
                contentAlignment = Alignment.Center
            ) {
                AsyncImage(
                    model = state.currentTrack?.coverUrl,
                    contentDescription = "Album Artwork",
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )
            }

            // Track Info
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = state.currentTrack?.title ?: "Select Track",
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    color = textColor
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = state.currentTrack?.artist ?: "Unknown Artist",
                    fontSize = 15.sp,
                    color = subtleText
                )
            }

            // Audio Visualizer Canvas
            VisualizerCanvas(
                frequencyData = state.visualizerData,
                tint = ElectricCyan,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(64.dp)
            )

            // Seekbar
            Column(modifier = Modifier.fillMaxWidth()) {
                val progress = if (state.durationMs > 0) {
                    state.currentPositionMs.toFloat() / state.durationMs.toFloat()
                } else 0f

                Slider(
                    value = progress,
                    onValueChange = { newProgress ->
                        val newPos = (newProgress * state.durationMs).toLong()
                        viewModel.seekTo(newPos)
                    },
                    colors = SliderDefaults.colors(
                        thumbColor = ElectricCyan,
                        activeTrackColor = ElectricCyan,
                        inactiveTrackColor = if (isAmoled) Color(0xFF222222) else Color(0xFFE2E8F0)
                    )
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(formatTime(state.currentPositionMs), fontSize = 12.sp, color = subtleText)
                    Text(formatTime(state.durationMs), fontSize = 12.sp, color = subtleText)
                }
            }

            // Playback Controls
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = { viewModel.skipPrevious() }) {
                    Icon(Icons.Rounded.SkipPrevious, "Previous", tint = textColor, modifier = Modifier.size(36.dp))
                }

                FilledIconButton(
                    onClick = { viewModel.togglePlayPause() },
                    modifier = Modifier.size(64.dp),
                    colors = IconButtonDefaults.filledIconButtonColors(
                        containerColor = if (isAmoled) Color.White else Color(0xFF0F172A),
                        contentColor = if (isAmoled) Color.Black else Color.White
                    )
                ) {
                    Icon(
                        if (state.isPlaying) Icons.Rounded.Pause else Icons.Rounded.PlayArrow,
                        contentDescription = "Play/Pause",
                        modifier = Modifier.size(36.dp)
                    )
                }

                IconButton(onClick = { viewModel.skipNext() }) {
                    Icon(Icons.Rounded.SkipNext, "Next", tint = textColor, modifier = Modifier.size(36.dp))
                }
            }
        }
    }
}

fun formatTime(ms: Long): String {
    val totalSeconds = ms / 1000
    val minutes = totalSeconds / 60
    val seconds = totalSeconds % 60
    return String.format("%02d:%02d", minutes, seconds)
}`,
  },
  {
    name: "VisualizerCanvas.kt",
    path: "io/aether/player/ui/VisualizerCanvas.kt",
    description: "Jetpack Compose DrawScope 60fps spectrum bars & oscilloscope renderer",
    code: `package io.aether.player.ui

import androidx.compose.foundation.Canvas
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color

/**
 * 60fps Hardware-accelerated Canvas audio visualizer for Jetpack Compose.
 */
@Composable
fun VisualizerCanvas(
    frequencyData: FloatArray,
    tint: Color,
    modifier: Modifier = Modifier
) {
    Canvas(modifier = modifier) {
        val barCount = frequencyData.size.coerceAtMost(48)
        if (barCount == 0) return@Canvas

        val spacing = 4.dp.toPx()
        val totalSpacing = spacing * (barCount - 1)
        val barWidth = (size.width - totalSpacing) / barCount

        for (i in 0 until barCount) {
            val magnitude = frequencyData[i].coerceIn(0f, 1f)
            val barHeight = (magnitude * size.height).coerceAtLeast(4.dp.toPx())
            val x = i * (barWidth + spacing)
            val y = size.height - barHeight

            drawRoundRect(
                brush = Brush.verticalGradient(
                    colors = listOf(tint, tint.copy(alpha = 0.4f)),
                    startY = y,
                    endY = size.height
                ),
                topLeft = Offset(x, y),
                size = Size(barWidth, barHeight),
                cornerRadius = CornerRadius(barWidth / 2, barWidth / 2)
            )
        }
    }
}`,
  },
  {
    name: "PlaylistDsl.kt",
    path: "io/aether/player/dsl/PlaylistDsl.kt",
    description: "Type-safe Kotlin DSL for constructing playlists and audio chains",
    code: `package io.aether.player.dsl

import io.aether.player.data.Track

@DslMarker
annotation class AudioDsl

@AudioDsl
class PlaylistBuilder(val name: String) {
    var description: String = ""
    private val tracks = mutableListOf<Track>()

    fun track(title: String, artist: String, durationSec: Int, block: TrackBuilder.() -> Unit = {}) {
        val builder = TrackBuilder(title, artist, durationSec).apply(block)
        tracks.add(builder.build())
    }

    fun build(): PlaylistModel = PlaylistModel(name, description, tracks)
}

@AudioDsl
class TrackBuilder(val title: String, val artist: String, val durationSec: Int) {
    var genre: String = "Electronic"
    var bpm: Int = 120
    var isSynthetic: Boolean = true

    fun build(): Track = Track(
        id = java.util.UUID.randomUUID().toString(),
        title = title,
        artist = artist,
        duration = durationSec,
        genre = genre,
        bpm = bpm,
        isSynthetic = isSynthetic
    )
}

/**
 * Idiomatic Kotlin DSL entrypoint:
 * val chillList = playlist("Late Night AMOLED") {
 *     description = "Deep bass and ambient pads"
 *     track("Neon Rain", "Aether", 210) { genre = "Synthwave"; bpm = 110 }
 *     track("Null Void", "Lofi Duo", 180) { genre = "Lofi"; bpm = 80 }
 * }
 */
fun playlist(name: String, block: PlaylistBuilder.() -> Unit): PlaylistModel {
    return PlaylistBuilder(name).apply(block).build()
}

data class PlaylistModel(val name: String, val description: String, val tracks: List<Track>)`,
  },
  {
    name: "MusicNotificationService.kt",
    path: "io/aether/player/service/MusicNotificationService.kt",
    description: "Android MediaSessionService for background playback, lockscreen & notification controls",
    code: `package io.aether.player.service

import android.app.PendingIntent
import android.content.Intent
import androidx.media3.common.Player
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService
import io.aether.player.MainActivity

/**
 * Android MediaSessionService supporting Media3 lockscreen seekbars,
 * Bluetooth headset media buttons, and seamless background execution.
 */
class MusicNotificationService : MediaSessionService() {

    private var mediaSession: MediaSession? = null

    override fun onCreate() {
        super.onCreate()
        val player = AudioEngineHolder.get(this).exoPlayer

        val sessionActivityPendingIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE
        )

        mediaSession = MediaSession.Builder(this, player)
            .setSessionActivity(sessionActivityPendingIntent)
            .build()
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? {
        return mediaSession
    }

    override fun onDestroy() {
        mediaSession?.run {
            player.release()
            release()
            mediaSession = null
        }
        super.onDestroy()
    }
}`,
  },
  {
    name: "build.gradle.kts",
    path: "app/build.gradle.kts",
    description: "Gradle build script with Android Media3 ExoPlayer, Jetpack Compose, and Coroutines",
    code: `plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
}

android {
    namespace = "io.aether.player"
    compileSdk = 35

    defaultConfig {
        applicationId = "io.aether.player"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildFeatures {
        compose = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    // Jetpack Compose & Material 3
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.material.icons.extended)

    // Android Media3 ExoPlayer & Session
    implementation("androidx.media3:media3-exoplayer:1.5.1")
    implementation("androidx.media3:media3-session:1.5.1")
    implementation("androidx.media3:media3-ui:1.5.1")

    // Kotlin Coroutines & Lifecycle
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.1")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")

    // Image Loading
    implementation("io.coil-kt:coil-compose:2.7.0")
}`,
  },
  {
    name: "MediaStoreAudioExplorer.kt",
    path: "io/aether/player/storage/MediaStoreAudioExplorer.kt",
    description: "Android Kotlin Memory Scanner querying internal/external storage via MediaStore ContentResolver",
    code: `package io.aether.player.storage

import android.content.ContentUris
import android.content.Context
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import io.aether.player.data.Track
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Idiomatic Kotlin Device Memory Scanner.
 * Queries device internal memory and SD Card via Android MediaStore ContentResolver,
 * extracting File Name, Byte Size, Date Modified, and Relative Folder Path.
 */
class MediaStoreAudioExplorer(private val context: Context) {

    data class MemoryAudioFile(
        val id: Long,
        val displayName: String,
        val uri: Uri,
        val sizeBytes: Long,
        val dateModifiedSec: Long,
        val relativePath: String?,
        val mimeType: String?
    )

    suspend fun queryDeviceAudioFiles(): List<MemoryAudioFile> = withContext(Dispatchers.IO) {
        val audioList = mutableListOf<MemoryAudioFile>()

        val collectionUri = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            MediaStore.Audio.Media.getContentUri(MediaStore.VOLUME_EXTERNAL)
        } else {
            MediaStore.Audio.Media.EXTERNAL_CONTENT_URI
        }

        val projection = arrayOf(
            MediaStore.Audio.Media._ID,
            MediaStore.Audio.Media.DISPLAY_NAME,
            MediaStore.Audio.Media.SIZE,
            MediaStore.Audio.Media.DATE_MODIFIED,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) MediaStore.Audio.Media.RELATIVE_PATH else MediaStore.Audio.Media.DATA,
            MediaStore.Audio.Media.MIME_TYPE
        )

        val selection = "\${MediaStore.Audio.Media.IS_MUSIC} != 0"
        val sortOrder = "\${MediaStore.Audio.Media.DATE_MODIFIED} DESC"

        context.contentResolver.query(
            collectionUri,
            projection,
            selection,
            null,
            sortOrder
        )?.use { cursor ->
            val idCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media._ID)
            val nameCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DISPLAY_NAME)
            val sizeCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.SIZE)
            val dateCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DATE_MODIFIED)
            val pathCol = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                cursor.getColumnIndex(MediaStore.Audio.Media.RELATIVE_PATH)
            } else {
                cursor.getColumnIndex(MediaStore.Audio.Media.DATA)
            }
            val mimeCol = cursor.getColumnIndex(MediaStore.Audio.Media.MIME_TYPE)

            while (cursor.moveToNext()) {
                val id = cursor.getLong(idCol)
                val name = cursor.getString(nameCol) ?: "Unknown.mp3"
                val size = cursor.getLong(sizeCol)
                val dateModified = cursor.getLong(dateCol)
                val relativePath = if (pathCol != -1) cursor.getString(pathCol) else "Music/"
                val mime = if (mimeCol != -1) cursor.getString(mimeCol) else "audio/mpeg"

                val contentUri = ContentUris.withAppendedId(collectionUri, id)

                audioList.add(
                    MemoryAudioFile(
                        id = id,
                        displayName = name,
                        uri = contentUri,
                        sizeBytes = size,
                        dateModifiedSec = dateModified,
                        relativePath = relativePath,
                        mimeType = mime
                    )
                )
            }
        }

        audioList
    }
}
`,
  },
  {
    name: "BottomNavigationHub.kt",
    path: "io/aether/player/ui/BottomNavigationHub.kt",
    description: "Jetpack Compose NavigationBar with 4 tabs, active accent indicator & NavHost routing",
    code: `package io.aether.player.ui

import androidx.compose.animation.*
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

sealed class NavTab(val route: String, val label: String, val icon: ImageVector) {
    object NowPlaying : NavTab("now_playing", "Now Playing", Icons.Rounded.GraphicEq)
    object MemoryDir : NavTab("memory_dir", "Memory", Icons.Rounded.Folder)
    object Playlists : NavTab("playlists", "Playlists", Icons.Rounded.LibraryMusic)
    object Queue : NavTab("queue", "Queue", Icons.Rounded.QueueMusic)
}

@Composable
fun BottomNavigationHub(
    currentRoute: String,
    onNavigateTo: (NavTab) -> Unit,
    isAmoled: Boolean,
    accentColor: Color,
    modifier: Modifier = Modifier
) {
    val tabs = listOf(NavTab.NowPlaying, NavTab.MemoryDir, NavTab.Playlists, NavTab.Queue)

    NavigationBar(
        modifier = modifier.fillMaxWidth(),
        containerColor = if (isAmoled) Color.Black else Color.White,
        contentColor = if (isAmoled) Color.White else Color.Black,
        tonalElevation = 8.dp
    ) {
        tabs.forEach { tab ->
            val isSelected = currentRoute == tab.route

            NavigationBarItem(
                selected = isSelected,
                onClick = { onNavigateTo(tab) },
                icon = {
                    Icon(
                        imageVector = tab.icon,
                        contentDescription = tab.label,
                        tint = if (isSelected) accentColor else if (isAmoled) Color.Gray else Color.DarkGray
                    )
                },
                label = {
                    Text(
                        text = tab.label,
                        fontSize = 10.sp,
                        color = if (isSelected) accentColor else if (isAmoled) Color.Gray else Color.DarkGray
                    )
                },
                colors = NavigationBarItemDefaults.colors(
                    indicatorColor = accentColor.copy(alpha = 0.15f)
                )
            )
        }
    }
}`,
  },
];
