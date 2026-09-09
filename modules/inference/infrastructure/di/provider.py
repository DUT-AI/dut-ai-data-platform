from dishka import Provider, Scope, provide

from core.config import inference_settings
from modules.inference.application.use_cases.execute_inference import ExecuteInferenceUseCase
from modules.inference.domain.interfaces import IRuntimeClient
from modules.inference.infrastructure.clients.grpc_client import GRPCRuntimeClient
from modules.inference.infrastructure.clients.vllm_client import VLLMRuntimeClient


class InferenceProvider(Provider):
    """Dishka Dependency Injection Provider for Inference Domain."""

    @provide(scope=Scope.APP)
    def provide_runtime_client(self) -> IRuntimeClient:
        if inference_settings.inference_protocol.lower() == "grpc":
            return GRPCRuntimeClient()
        return VLLMRuntimeClient()

    @provide(scope=Scope.REQUEST)
    def provide_execute_inference_use_case(
        self, client: IRuntimeClient
    ) -> ExecuteInferenceUseCase:
        return ExecuteInferenceUseCase(runtime_client=client)
