<template>
  <q-card flat bordered class="q-mb-md">
    <q-card-section>
      <div class="text-h6">Home</div>
      <div class="text-body2 text-grey-7 q-mt-sm">
        Follow this workflow to build a prompt, configure a model, and run a job.
      </div>
    </q-card-section>
    <q-separator />
    <q-card-section>
      <q-stepper
        v-model="homeStep"
        flat
        animated
        header-nav
        alternative-labels
        color="primary"
        active-color="primary"
        done-color="secondary"
        inactive-color="grey-7"
      >
        <q-step :name="1" title="Choose Styles" icon="palette">
          <div class="text-body1">Step 1 - Choose Styles</div>
          <div class="text-body2 text-grey-7 q-mt-sm">
            Start by shaping the visual language you want. You can mix styles from different sources,
            then send the best combination into the Prompt tab.
          </div>

          <div class="home-style-cards q-mt-md">
            <q-card flat bordered class="home-style-card">
              <q-card-section>
                <div class="text-subtitle1 text-weight-medium">Images</div>
                <div class="text-body2 text-grey-7 q-mt-sm">
                  Browse generated images and quickly reuse their style sets.
                </div>
                <ul class="home-style-list q-mt-sm">
                  <li>Great for finding proven combinations</li>
                  <li>One-click style transfer into Custom Styles</li>
                  <li>Best when you want to iterate from an existing look</li>
                </ul>
              </q-card-section>
            </q-card>

            <q-card flat bordered class="home-style-card">
              <q-card-section>
                <div class="text-subtitle1 text-weight-medium">Saved Styles</div>
                <div class="text-body2 text-grey-7 q-mt-sm">
                  Pick from curated named styles organized by category.
                </div>
                <ul class="home-style-list q-mt-sm">
                  <li>Fast shortcuts for recognizable art directions</li>
                  <li>Each style adds a rich prompt phrase</li>
                  <li>Useful when you want high-quality starting points</li>
                </ul>
              </q-card-section>
            </q-card>

            <q-card flat bordered class="home-style-card">
              <q-card-section>
                <div class="text-subtitle1 text-weight-medium">Custom Styles</div>
                <div class="text-body2 text-grey-7 q-mt-sm">
                  Build precise combinations by selecting grouped style options.
                </div>
                <ul class="home-style-list q-mt-sm">
                  <li>Fine-grained control over each style subcategory</li>
                  <li>See selected options summarized before adding to prompt</li>
                  <li>Best for targeted edits and deliberate composition</li>
                </ul>
              </q-card-section>
            </q-card>
          </div>

          <q-banner rounded class="bg-blue-1 text-blue-10 q-mt-md">
            Tip: start with a small style set, review the prompt text, then add more only if needed.
          </q-banner>

          <q-stepper-navigation>
            <q-btn color="primary" label="Continue" @click="homeStep = 2" />
          </q-stepper-navigation>
        </q-step>

        <q-step :name="2" title="Define Your Prompt" icon="edit_note">
          <div class="text-body1">Step 2 - Define Prompt</div>
          <div class="text-body2 text-grey-7 q-mt-sm">
            In the Prompt tab, review selected styles and write your subject/background description.
          </div>
          <ul class="home-style-list q-mt-sm">
            <li>Keep the description focused on subject, scene, and constraints</li>
            <li>Use style summary and saved styles as modifiers</li>
            <li>Validate the final prompt preview before adding to a job</li>
          </ul>
          <q-stepper-navigation>
            <q-btn flat label="Back" @click="homeStep = 1" />
            <q-btn color="primary" label="Continue" @click="homeStep = 3" />
          </q-stepper-navigation>
        </q-step>

        <q-step :name="3" title="Choose a Model" icon="tune">
          <div class="text-body1">Step 3 - Configure Model</div>
          <div class="text-body2 text-grey-7 q-mt-sm">
            Pick provider/model and tune execution settings in the Models tab.
          </div>
          <ul class="home-style-list q-mt-sm">
            <li>Select a model that matches your style and quality goals</li>
            <li>Set aspect ratio, resolution, and optional chain settings</li>
            <li>Save model settings to the target job</li>
          </ul>
          <q-stepper-navigation>
            <q-btn flat label="Back" @click="homeStep = 2" />
            <q-btn color="primary" label="Continue" @click="homeStep = 4" />
          </q-stepper-navigation>
        </q-step>

        <q-step :name="4" title="Create and Run a Job" icon="work_outline">
          <div class="text-body1">Step 4 - Create and Run</div>
          <div class="text-body2 text-grey-7 q-mt-sm">
            Add prompts to a job, inspect details, and run generation from the Jobs tab.
          </div>
          <ul class="home-style-list q-mt-sm">
            <li>Create a new job or reuse an existing one for prompt batches</li>
            <li>Review per-prompt prompt text, styles, and diagnostics</li>
            <li>Run and inspect outputs in Jobs and Images views</li>
          </ul>
          <q-stepper-navigation>
            <q-btn flat label="Back" @click="homeStep = 3" />
          </q-stepper-navigation>
        </q-step>
      </q-stepper>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { ref } from 'vue';

const homeStep = ref(1);
</script>

<style scoped>
.home-style-cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.home-style-card {
  border-radius: 12px;
  background: #fff;
  border-color: rgba(28, 110, 140, 0.28);
}

.home-style-list {
  margin: 0;
  padding-left: 18px;
  line-height: 1.5;
}

@media (max-width: 1150px) {
  .home-style-cards {
    grid-template-columns: 1fr;
  }
}
</style>
