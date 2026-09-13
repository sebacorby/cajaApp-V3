Feature: Import salary receipt from PDF
  Upload a salary receipt PDF, review the extracted preview, and accept it as income.

  Background:
    Given the user is on the importaciones section

  Scenario: Upload receipt creates a reviewable draft
    When the user uploads a salary receipt PDF
    Then a receipt draft is created in processing state
    And the draft becomes ready for preview once extraction finishes

  Scenario: Accept draft records the receipt
    Given a receipt draft ready for preview
    When the user accepts the draft
    Then an accepted salary receipt exists with its items

  Scenario: Failed extraction surfaces an error state
    Given a receipt PDF that cannot be extracted
    When the user uploads it
    Then the draft ends in failed state with an error message
