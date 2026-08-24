package know.engine.document.service.impl;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

class DocumentObjectPathTest {
    @Test
    void preservesBucketNameInsideObjectKey() {
        var service = new DocumentProcessServiceImpl();
        ReflectionTestUtils.setField(service, "bucketName", "know-engine");
        assertEquals("know-engine-container-smoke.txt", ReflectionTestUtils.invokeMethod(service,
                "extractObjectNameFromUrl", "http://localhost:19090/know-engine/know-engine-container-smoke.txt"));
        assertEquals("converted/folder/file.md", ReflectionTestUtils.invokeMethod(service,
                "extractObjectNameFromUrl", "http://localhost:19090/know-engine/converted/folder/file.md"));
        assertNull(ReflectionTestUtils.invokeMethod(service, "extractObjectNameFromUrl", "http://localhost/other/file.txt"));
        assertNull(ReflectionTestUtils.invokeMethod(service, "extractObjectNameFromUrl", "http://localhost/know-engine/"));
    }
}
