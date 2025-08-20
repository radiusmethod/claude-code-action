import * as core from "@actions/core";
import { mkdir, writeFile } from "fs/promises";
import type { Mode, ModeOptions, ModeResult } from "../types";
import { isPushEvent } from "../../github/context";
import type { PreparedContext } from "../../create-prompt/types";
import type { Commit } from "@octokit/webhooks-types";

export const releaseNotesMode: Mode = {
  name: "release-notes",
  description: "Generate release notes on push events",

  shouldTrigger(context) {
    if (!isPushEvent(context)) return false;
    const targetBranch = context.inputs.baseBranch || "main";
    // Type guard to ensure we have a push event payload
    if (context.eventName === "push" && "ref" in context.payload) {
      return context.payload.ref === `refs/heads/${targetBranch}`;
    }
    return false;
  },

  prepareContext(context, data?) {
    // Release notes mode doesn't use comment tracking or PR/issue management
    return {
      mode: "release-notes" as const,
      githubContext: context,
      baseBranch: data?.baseBranch || "main",
      claudeBranch: undefined,
    };
  },

  getAllowedTools() {
    // Return empty array - tools are configured via action inputs
    return [];
  },

  getDisallowedTools() {
    // Return empty array - tools are configured via action inputs
    return [];
  },

  shouldCreateTrackingComment() {
    return false; // Like agent mode
  },

  generatePrompt(context: PreparedContext): string {
    // Check for override prompt first
    if (context.overridePrompt) {
      return context.overridePrompt;
    }

    // Build release notes specific prompt
    let promptContent = `You are Claude, an AI assistant designed to help with GitHub automation tasks.\n\n`;
    
    promptContent += `Repository: ${context.repository}\n`;
    promptContent += `Event: Push to branch\n\n`;
    
    // This will be handled in the prepare method where we have access to the actual push payload
    
    // Use direct prompt if provided, otherwise use custom instructions
    if (context.directPrompt) {
      promptContent += `\nTask Instructions:\n${context.directPrompt}\n`;
    } else if (context.customInstructions) {
      promptContent += `\nTask Instructions:\n${context.customInstructions}\n`;
    } else {
      promptContent += `\nGenerate release notes for the recent changes pushed to the repository.\n`;
    }
    
    return promptContent;
  },

  async prepare({ context }: ModeOptions): Promise<ModeResult> {
    // Release notes mode handles push events only
    if (!isPushEvent(context)) {
      throw new Error("Release notes mode requires push event context");
    }

    // We don't need GitHub data for push event release notes

    // For push events in release-notes mode, we need to create a compatible context
    // since createPrompt expects ParsedGitHubContext but we have AutomationContext
    // We'll bypass createPrompt and create our own prompt handling
    
    await mkdir(`${process.env.RUNNER_TEMP || "/tmp"}/claude-prompts`, {
      recursive: true,
    });

    // Generate the prompt directly for this mode
    let promptContent = `You are Claude, an AI assistant designed to help with GitHub automation tasks.\n\n`;
    promptContent += `Repository: ${context.repository.full_name}\n`;
    promptContent += `Event: Push to branch\n\n`;
    
    // Add push event details
    if (context.eventName === "push" && "commits" in context.payload && context.payload.commits) {
      const commits = context.payload.commits
        .map((c: Commit) => `${c.id.slice(0,7)}: ${c.message}`)
        .join('\n');
      promptContent += `Recent Commits:\n${commits}\n\n`;
    }
    
    // Use custom instructions if provided
    if (context.inputs.customInstructions) {
      promptContent += `\nTask Instructions:\n${context.inputs.customInstructions}\n`;
    } else if (context.inputs.directPrompt) {
      promptContent += `\nTask Instructions:\n${context.inputs.directPrompt}\n`;
    } else if (context.inputs.overridePrompt) {
      promptContent = context.inputs.overridePrompt;
    } else {
      promptContent += `\nGenerate release notes for the recent changes pushed to the repository.\n`;
    }
    
    // Write the prompt file
    await writeFile(
      `${process.env.RUNNER_TEMP || "/tmp"}/claude-prompts/claude-prompt.txt`,
      promptContent
    );
    
    // Set up allowed/disallowed tools
    const baseTools = [
      "Edit",
      "MultiEdit", 
      "Glob",
      "Grep",
      "LS",
      "Read",
      "Write",
    ];
    
    const allowedTools = [...baseTools, ...context.inputs.allowedTools];
    const disallowedTools = [
      "WebSearch",
      "WebFetch",
      ...context.inputs.disallowedTools,
    ];
    
    core.exportVariable("ALLOWED_TOOLS", allowedTools.join(","));
    core.exportVariable("DISALLOWED_TOOLS", disallowedTools.join(","));

    // Get MCP configuration (minimal for release notes)
    const mcpConfig: any = {
      mcpServers: {},
    };
    
    // Add user-provided additional MCP config if any
    const additionalMcpConfig = process.env.MCP_CONFIG || "";
    if (additionalMcpConfig.trim()) {
      try {
        const additional = JSON.parse(additionalMcpConfig);
        if (additional && typeof additional === "object") {
          Object.assign(mcpConfig, additional);
        }
      } catch (error) {
        core.warning(`Failed to parse additional MCP config: ${error}`);
      }
    }

    core.setOutput("mcp_config", JSON.stringify(mcpConfig));

    return {
      commentId: undefined,
      branchInfo: {
        baseBranch: "main",
        currentBranch: "main",
        claudeBranch: undefined,
      },
      mcpConfig: JSON.stringify(mcpConfig),
    };
  },

  getSystemPrompt(): string | undefined {
    // Return undefined - system prompt can be configured via action inputs
    return undefined;
  }
};
