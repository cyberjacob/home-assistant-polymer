import {
  html,
  LitElement,
  PropertyDeclarations,
  PropertyValues,
} from "@polymer/lit-element";
import { classMap } from "lit-html/directives/classMap";
import { TemplateResult } from "lit-html";
import { jQuery } from "../../../resources/jquery";

import applyThemesOnElement from "../../../common/dom/apply_themes_on_element";
import computeStateName from "../../../common/entity/compute_state_name";

import { hasConfigOrEntityChanged } from "../common/has-changed";
import { roundSliderStyle } from "../../../resources/jquery.roundslider";
import { HomeAssistant, ClimateEntity } from "../../../types";
import { hassLocalizeLitMixin } from "../../../mixins/lit-localize-mixin";
import { LovelaceCard, LovelaceConfig } from "../types";

import "../../../components/ha-card";
import "../../../components/ha-icon";

const thermostatConfig = {
  radius: 150,
  step: 1,
  circleShape: "pie",
  startAngle: 315,
  width: 5,
  lineCap: "round",
  handleSize: "+10",
  showTooltip: false,
};

const modeIcons = {
  auto: "hass:autorenew",
  heat: "hass:fire",
  cool: "hass:snowflake",
  off: "hass:power",
};

interface Config extends LovelaceConfig {
  entity: string;
  theme?: string;
}

function formatTemp(temps: string[]): string {
  return temps.filter(Boolean).join("-");
}

export class HuiThermostatCard extends hassLocalizeLitMixin(LitElement)
  implements LovelaceCard {
  public hass?: HomeAssistant;
  private _config?: Config;

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      _config: {},
    };
  }

  public getCardSize(): number {
    return 4;
  }

  public setConfig(config: Config): void {
    if (!config.entity || config.entity.split(".")[0] !== "climate") {
      throw new Error("Specify an entity from within the climate domain.");
    }

    this._config = { theme: "default", ...config };
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }
    const stateObj = this.hass.states[this._config.entity] as ClimateEntity;
    const broadCard = this.clientWidth > 390;
    const mode = modeIcons[stateObj.attributes.operation_mode || ""]
      ? stateObj.attributes.operation_mode!
      : "unknown-mode";
    return html`
      ${this.renderStyle()}
      <ha-card
        class="${classMap({
          [mode]: true,
          large: broadCard,
          small: !broadCard,
        })}">
        <div id="root">
          <div id="thermostat"></div>
          <div id="tooltip">
            <div class="title">${computeStateName(stateObj)}</div>
            <div class="current-temperature">
              <span class="current-temperature-text">${
                stateObj.attributes.current_temperature
              }
                <span class="uom">${
                  this.hass.config.unit_system.temperature
                }</span>
              </span>
            </div>
            <div class="climate-info">
            <div id="set-temperature"></div>
            <div class="current-mode">${this.localize(
              `state.climate.${stateObj.state}`
            )}</div>
            <div class="modes">
              ${(stateObj.attributes.operation_list || []).map((modeItem) =>
                this._renderIcon(modeItem, mode)
              )}
            </div>
          </div>
        </div>
      </ha-card>
    `;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  protected firstUpdated(): void {
    const stateObj = this.hass!.states[this._config!.entity] as ClimateEntity;

    const _sliderType =
      stateObj.attributes.target_temp_low &&
      stateObj.attributes.target_temp_high
        ? "range"
        : "min-range";

    jQuery("#thermostat", this.shadowRoot).roundSlider({
      ...thermostatConfig,
      radius: this.clientWidth / 3,
      min: stateObj.attributes.min_temp,
      max: stateObj.attributes.max_temp,
      sliderType: _sliderType,
      change: (value) => this._setTemperature(value),
      drag: (value) => this._dragEvent(value),
    });
  }

  protected updated(changedProps: PropertyValues): void {
    if (!this._config || !this.hass) {
      return;
    }

    const stateObj = this.hass.states[this._config.entity] as ClimateEntity;

    let sliderValue;
    let uiValue;

    if (
      stateObj.attributes.target_temp_low &&
      stateObj.attributes.target_temp_high
    ) {
      sliderValue = `${stateObj.attributes.target_temp_low}, ${
        stateObj.attributes.target_temp_high
      }`;
      uiValue = formatTemp([
        String(stateObj.attributes.target_temp_low),
        String(stateObj.attributes.target_temp_high),
      ]);
    } else {
      sliderValue = uiValue = stateObj.attributes.temperature;
    }

    jQuery("#thermostat", this.shadowRoot).roundSlider({
      value: sliderValue,
    });
    this.shadowRoot!.querySelector("#set-temperature")!.innerHTML = uiValue;

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    if (!oldHass || oldHass.themes !== this.hass.themes) {
      applyThemesOnElement(this, this.hass.themes, this._config.theme);
    }
  }

  private renderStyle(): TemplateResult {
    return html`
    ${roundSliderStyle}
    <style>
      :host {
        display: block;
      }
      ha-card {
        overflow: hidden;
        --rail-border-color: transparent;
        --auto-color: green;
        --cool-color: #2b9af9;
        --heat-color: #FF8100;
        --off-color: #8a8a8a;
        --unknown-color: #bac;
      }
      #root {
        position: relative;
        overflow: hidden;
      }
      .auto {
        --mode-color: var(--auto-color);
      }
      .cool {
        --mode-color: var(--cool-color);
      }
      .heat {
        --mode-color: var(--heat-color);
      }
      .off {
        --mode-color: var(--off-color);
      }
      .unknown-mode {
        --mode-color: var(--unknown-color);
      }
      .no-title {
        --title-margin-top: 33% !important;
      }
      .large {
        --thermostat-padding-top: 25px;
        --thermostat-margin-bottom: 25px;
        --title-font-size: 28px;
        --title-margin-top: 20%;
        --climate-info-margin-top: 17%;
        --modes-margin-top: 2%;
        --set-temperature-font-size: 25px;
        --current-temperature-font-size: 71px;
        --current-temperature-margin-top: 10%;
        --current-temperature-text-padding-left: 15px;
        --uom-font-size: 20px;
        --uom-margin-left: -18px;
        --current-mode-font-size: 18px;
        --set-temperature-padding-bottom: 5px;
      }
      .small {
        --thermostat-padding-top: 15px;
        --thermostat-margin-bottom: 15px;
        --title-font-size: 18px;
        --title-margin-top: 20%;
        --climate-info-margin-top: 7.5%;
        --modes-margin-top: 1%;
        --set-temperature-font-size: 16px;
        --current-temperature-font-size: 25px;
        --current-temperature-margin-top: 5%;
        --current-temperature-text-padding-left: 7px;
        --uom-font-size: 12px;
        --uom-margin-left: -5px;
        --current-mode-font-size: 14px;
        --set-temperature-padding-bottom: 0px;
      }
      #thermostat {
        margin: 0 auto var(--thermostat-margin-bottom);
        padding-top: var(--thermostat-padding-top);
      }
      #thermostat .rs-range-color  {
        background-color: var(--mode-color, var(--disabled-text-color));
      }
      #thermostat .rs-path-color  {
          background-color: var(--disabled-text-color);
      }
      #thermostat .rs-handle  {
          background-color: var(--paper-card-background-color, white);
          padding: 7px;
          border: 2px solid var(--disabled-text-color);
      }
      #thermostat .rs-handle.rs-focus  {
          border-color: var(--mode-color, var(--disabled-text-color));
      }
      #thermostat .rs-handle:after  {
          border-color: var(--mode-color, var(--disabled-text-color));
          background-color: var(--mode-color, var(--disabled-text-color));
      }
      #thermostat .rs-border  {
        border-color: var(--rail-border-color);
      }
      #thermostat .rs-bar.rs-transition.rs-first, .rs-bar.rs-transition.rs-second{
        z-index: 20 !important;
      }
      #thermostat .rs-inner.rs-bg-color.rs-border,
      #thermostat .rs-overlay.rs-transition.rs-bg-color {
        background-color: var(--paper-card-background-color, white);
      }
      #tooltip {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 100%;
        text-align: center;
        z-index: 15;
        color: var(--primary-text-color);
      }
      #set-temperature {
        font-size: var(--set-temperature-font-size);
        padding-bottom: var(--set-temperature-padding-bottom);
      }
      .title {
        font-size: var(--title-font-size);
        margin-top: var(--title-margin-top);
      }
      .climate-info {
        margin-top: var(--climate-info-margin-top);
      }
      .current-mode {
        font-size: var(--current-mode-font-size);
        color: var(--secondary-text-color);
      }
      .modes {
        margin-top: var(--modes-margin-top);
      }
      .modes ha-icon {
        color: var(--disabled-text-color);
        cursor: pointer;
        display: inline-block;
        margin: 0 10px;
      }
      .modes ha-icon.selected-icon {
        color: var(--mode-color);
      }
      .current-temperature {
        margin-top: var(--current-temperature-margin-top);
        font-size: var(--current-temperature-font-size);
      }
      .current-temperature-text {
        padding-left: var(--current-temperature-text-padding-left);
      }
      .uom {
        font-size: var(--uom-font-size);
        vertical-align: top;
        margin-left: var(--uom-margin-left);
      }
    </style>
    `;
  }

  private _dragEvent(e): void {
    this.shadowRoot!.querySelector("#set-temperature")!.innerHTML = formatTemp(
      String(e.value).split(",")
    );
  }

  private _setTemperature(e): void {
    const stateObj = this.hass!.states[this._config!.entity] as ClimateEntity;
    if (
      stateObj.attributes.target_temp_low &&
      stateObj.attributes.target_temp_high
    ) {
      if (e.handle.index === 1) {
        this.hass!.callService("climate", "set_temperature", {
          entity_id: this._config!.entity,
          target_temp_low: e.handle.value,
          target_temp_high: stateObj.attributes.target_temp_high,
        });
      } else {
        this.hass!.callService("climate", "set_temperature", {
          entity_id: this._config!.entity,
          target_temp_low: stateObj.attributes.target_temp_low,
          target_temp_high: e.handle.value,
        });
      }
    } else {
      this.hass!.callService("climate", "set_temperature", {
        entity_id: this._config!.entity,
        temperature: e.value,
      });
    }
  }

  private _renderIcon(mode: string, currentMode: string): TemplateResult {
    if (!modeIcons[mode]) {
      return html``;
    }
    return html`<ha-icon
      class="${classMap({ "selected-icon": currentMode === mode })}"
      .mode="${mode}"
      .icon="${modeIcons[mode]}"
      @click="${this._handleModeClick}"
    ></ha-icon>`;
  }

  private _handleModeClick(e: MouseEvent): void {
    this.hass!.callService("climate", "set_operation_mode", {
      entity_id: this._config!.entity,
      operation_mode: (e.currentTarget as any).mode,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-thermostat-card": HuiThermostatCard;
  }
}

customElements.define("hui-thermostat-card", HuiThermostatCard);
