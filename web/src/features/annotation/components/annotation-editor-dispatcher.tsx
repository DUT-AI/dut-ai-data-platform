"use client";

import React from "react";
import {
  resolveEditorComponent,
  BaseEditorComponentProps,
} from "../registry/editor-registry";

export interface AnnotationEditorDispatcherProps extends BaseEditorComponentProps {
  outputTypeCode?: string;
  inputTypeCode?: string;
}

/**
 * AnnotationEditorDispatcher dynamically looks up and renders the corresponding
 * specialized Editor from the Editor Registry based on the active Ontology OutputDefinition.
 */
export function AnnotationEditorDispatcher({
  outputTypeCode,
  inputTypeCode,
  ...editorProps
}: AnnotationEditorDispatcherProps) {
  const EditorComponent = resolveEditorComponent(outputTypeCode, inputTypeCode);

  return React.createElement(EditorComponent, editorProps);
}
