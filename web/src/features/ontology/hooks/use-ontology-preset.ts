"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCategoryNodeFromForm, createInputNodeFromForm, createOutputNodeFromForm, jsonObjectToSchemaFields, saveVersionGraph } from "../api";
import type { OntologyPreset } from "../helpers/ontology-presets";
import type { InputDefinition, OutputDefinition } from "../types";
import { ONTOLOGY_KEYS } from "./use-ontologies";

interface ApplyPresetVariables {
  preset: OntologyPreset;
  inputDefinition: InputDefinition;
  outputDefinition: OutputDefinition;
}

export function useApplyOntologyPresetMutation(
  projectId: string,
  ontologyId: string,
  versionId: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      preset,
      inputDefinition,
      outputDefinition,
    }: ApplyPresetVariables) => {
      const input = await createInputNodeFromForm(
        projectId,
        ontologyId,
        {
          definition_id: inputDefinition.id,
          name: preset.input.name,
          description: preset.input.description,
          scope: preset.input.scope,
          allowed_extensions: preset.input.allowedExtensions,
          fields: jsonObjectToSchemaFields(preset.input.item),
        },
        inputDefinition
      );
      const output = await createOutputNodeFromForm(
        projectId,
        ontologyId,
        {
          definition_id: outputDefinition.id,
          name: preset.output.name,
          description: preset.output.description,
          multiple: preset.output.multiple,
          required: preset.output.required,
          fields: [],
        },
        outputDefinition
      );
      const categories = await Promise.all(
        preset.categories.map((category) =>
          createCategoryNodeFromForm(projectId, ontologyId, {
            key: category.key,
            name: category.name,
            color: category.color ?? "#2563EB",
            description: category.description,
          })
        )
      );

      return saveVersionGraph(projectId, ontologyId, versionId, {
        inputs: [{ input_id: input.id, sort_order: 0 }],
        outputs: [
          {
            output_id: output.id,
            input_id: input.id,
            category_ids: categories.map((category) => category.id),
            sort_order: 0,
          },
        ],
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ONTOLOGY_KEYS.project(projectId),
        }),
        queryClient.invalidateQueries({
          queryKey: ONTOLOGY_KEYS.detail(projectId, ontologyId),
        }),
        queryClient.invalidateQueries({
          queryKey: ONTOLOGY_KEYS.nodes(projectId, ontologyId),
        }),
        queryClient.invalidateQueries({
          queryKey: ONTOLOGY_KEYS.versions(projectId, ontologyId),
        }),
        queryClient.invalidateQueries({
          queryKey: ONTOLOGY_KEYS.version(projectId, ontologyId, versionId),
        }),
      ]);
    },
  });
}
