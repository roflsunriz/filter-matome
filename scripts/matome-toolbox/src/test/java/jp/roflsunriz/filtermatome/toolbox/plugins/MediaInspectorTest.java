package jp.roflsunriz.filtermatome.toolbox.plugins;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MediaInspectorTest {
    @Test
    void firefoxCompatibleH264AcceptsMainstreamEightBit420Profiles() {
        for (String profile : new String[]{
                "Constrained Baseline", "Baseline", "Main", "High", "Progressive High"
        }) {
            assertTrue(MediaInspector.isFirefoxCompatibleH264(
                    mediaInfo("h264", profile, "yuv420p")), profile);
        }
        assertTrue(MediaInspector.isFirefoxCompatibleH264(
                mediaInfo("h264", "High", "yuvj420p")));
    }

    @Test
    void firefoxCompatibleH264RejectsUnsupportedProfilesAndPixelFormats() {
        assertFalse(MediaInspector.isFirefoxCompatibleH264(
                mediaInfo("hevc", "Main", "yuv420p")));
        assertFalse(MediaInspector.isFirefoxCompatibleH264(
                mediaInfo("h264", "High 10", "yuv420p10le")));
        assertFalse(MediaInspector.isFirefoxCompatibleH264(
                mediaInfo("h264", "High 4:2:2", "yuv422p")));
        assertFalse(MediaInspector.isFirefoxCompatibleH264(
                mediaInfo("h264", "High 4:4:4 Predictive", "yuv444p")));
        assertFalse(MediaInspector.isFirefoxCompatibleH264(
                mediaInfo("h264", "", "yuv420p")));
    }

    private static MediaInspector.MediaInfo mediaInfo(
            String codec, String profile, String pixelFormat) {
        return new MediaInspector.MediaInfo(
                codec, "aac", true, 5_000_000, 192_000,
                1080, "mov,mp4,m4a,3gp,3g2,mj2", profile, pixelFormat);
    }
}
