Feature: Document imports from the conversation
  As the CajaApp owner
  I want to import supported financial documents from chat
  So that I can start existing draft-first workflows without leaving the conversation

  Scenario: Attach a supported document and request import
    Given the user attached a valid PDF or CSV within the allowed size
    When the user explicitly asks the agent to import it
    Then the matching CajaApp import flow is started
    And a draft or preview is created before any definitive acceptance

  Scenario: Do not import an attachment without user intent
    Given the user attached a supported document without an instruction
    When the agent receives the attachment
    Then no import is started automatically
    And the agent asks what the user wants to do with the file

  Scenario: Process multiple requested attachments
    Given the user attached multiple valid supported documents
    When the user asks to import all of them
    Then each attachment is processed as its own import workflow
    And each critical definitive acceptance remains a separate approval

  Scenario: Reuse a valid attachment after an import failure
    Given an import attempt failed before producing a recoverable draft or preview
    When the user asks to retry the same still-valid attachment
    Then the existing attachment can be reused without uploading it again

  Scenario: Reject an unsupported or oversized attachment
    Given the user selects a file that is not a supported PDF or CSV or exceeds the allowed size
    When CajaApp validates the attachment
    Then the attachment is rejected before import processing starts
    And the user receives a clear error

  Scenario: Require approval before definitive acceptance
    Given a document import produced a reviewable draft or preview
    When the user asks to accept it definitively
    Then the acceptance is treated as a critical action
    And no definitive materialization occurs before explicit approval