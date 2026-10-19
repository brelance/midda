package com.tongji.relation.outbox;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.core.task.TaskExecutor;
import org.springframework.kafka.core.KafkaTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

class CanalKafkaBridgeTest {
    @Test
    @SuppressWarnings("unchecked")
    void disabledBridgeDoesNotScheduleAConnection() {
        TaskExecutor executor = mock(TaskExecutor.class);
        KafkaTemplate<String, String> kafka = mock(KafkaTemplate.class);
        CanalKafkaBridge bridge = new CanalKafkaBridge(kafka, new ObjectMapper(), executor,
                false, "127.0.0.1", 11111, "example", "", "", "midda\\.outbox", 100, 1000);

        bridge.start();

        assertThat(bridge.isRunning()).isFalse();
        verifyNoInteractions(executor, kafka);
    }
}
